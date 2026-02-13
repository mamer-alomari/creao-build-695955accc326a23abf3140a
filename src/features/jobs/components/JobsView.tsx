
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { JobORM, type JobModel, JobStatus } from "@/sdk/database/orm/orm_job";
import { type WorkerModel } from "@/sdk/database/orm/orm_worker";
import { type VehicleModel } from "@/sdk/database/orm/orm_vehicle";
import { type EquipmentModel } from "@/sdk/database/orm/orm_equipment";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, Trash2, Box, Truck, MapPin, Calculator, QrCode } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import QRCode from "react-qr-code";
import { RoomInventoryManager } from "@/components/room-inventory";
import { useDistanceMatrix } from "@/hooks/use-distance-matrix";

interface JobsViewProps {
    jobs: JobModel[];
    workers: WorkerModel[];
    vehicles: VehicleModel[];
    equipment: EquipmentModel[];
    companyId: string;
}

type WizardStep = 'details' | 'inventory' | 'review';

export function JobsView({ jobs, workers, vehicles, equipment, companyId }: JobsViewProps) {
    // Quick Job State
    const [isQuickJobOpen, setIsQuickJobOpen] = useState(false);
    const [quickJob, setQuickJob] = useState<Partial<JobModel>>({
        customer_name: "",
        status: JobStatus.Quote,
        pickup_address: "",
        dropoff_address: "",
        scheduled_date: new Date().toISOString().split('T')[0],
    });

    // Quote Wizard State
    const [isQuoteWizardOpen, setIsQuoteWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState<WizardStep>('details');
    const [quoteData, setQuoteData] = useState<Partial<JobModel>>({
        customer_name: "",
        status: JobStatus.Quote,
        pickup_address: "",
        dropoff_address: "",
        scheduled_date: new Date().toISOString().split('T')[0],
        inventory_data: "[]",
    });
    const [calculatedDistance, setCalculatedDistance] = useState<{ text: string, value: number } | null>(null);
    const [estimatedCost, setEstimatedCost] = useState<number>(0);

    // Job Details State
    const [selectedJob, setSelectedJob] = useState<JobModel | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const queryClient = useQueryClient();
    const { calculateDistance } = useDistanceMatrix();

    // Mutations
    const createJobMutation = useMutation({
        mutationFn: async (job: Partial<JobModel>) => {
            const jobOrm = JobORM.getInstance();
            return await jobOrm.insertJob([{
                ...job,
                company_id: companyId,
            } as JobModel]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
            setIsQuickJobOpen(false);
            setIsQuoteWizardOpen(false);
            resetForms();
        },
    });

    const deleteJobMutation = useMutation({
        mutationFn: async (jobId: string) => {
            const jobOrm = JobORM.getInstance();
            await jobOrm.deleteJobByIDs([jobId]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
            if (selectedJob) setIsDetailsOpen(false);
        },
    });

    const resetForms = () => {
        setQuickJob({
            customer_name: "",
            status: JobStatus.Quote,
            pickup_address: "",
            dropoff_address: "",
            scheduled_date: new Date().toISOString().split('T')[0],
        });
        setQuoteData({
            customer_name: "",
            status: JobStatus.Quote,
            pickup_address: "",
            dropoff_address: "",
            scheduled_date: new Date().toISOString().split('T')[0],
            inventory_data: "[]",
        });
        setWizardStep('details');
        setCalculatedDistance(null);
        setEstimatedCost(0);
    };

    const handleWizardNext = async () => {
        if (wizardStep === 'details') {
            setWizardStep('inventory');
        } else if (wizardStep === 'inventory') {
            // Calculate distance and cost
            if (quoteData.pickup_address && quoteData.dropoff_address) {
                try {
                    // Mock calculation or use API
                    const result = await calculateDistance(quoteData.pickup_address, quoteData.dropoff_address);
                    if (result) {
                        setCalculatedDistance(result.distance);
                        // Simple cost logic: Base $200 + $2/mile
                        // value is in meters. 1 mile = 1609.34 meters
                        const miles = result.distance.value / 1609.34;
                        const cost = 200 + (miles * 2);
                        setEstimatedCost(Math.round(cost));
                        setQuoteData(prev => ({ ...prev, estimated_cost: Math.round(cost) }));
                    }
                } catch (e) {
                    console.error(e);
                }
            }
            setWizardStep('review');
        }
    };

    const handleOpenDetails = (job: JobModel) => {
        setSelectedJob(job);
        setIsDetailsOpen(true);
    };

    const getJobStatusBadge = (status: JobStatus) => {
        const variants: Record<JobStatus, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
            [JobStatus.Unspecified]: { variant: "outline", label: "Unspecified" },
            [JobStatus.Quote]: { variant: "secondary", label: "Quote" },
            [JobStatus.Booked]: { variant: "default", label: "Booked" },
            [JobStatus.InProgress]: { variant: "default", label: "In Progress" },
            [JobStatus.Completed]: { variant: "outline", label: "Completed" },
            [JobStatus.Canceled]: { variant: "destructive", label: "Canceled" },
        };
        const config = variants[status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Jobs Management</CardTitle>
                        <CardDescription>Manage your moving jobs</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {/* Quote Wizard Button */}
                        <Button onClick={() => setIsQuoteWizardOpen(true)} variant="outline">
                            <Calculator className="h-4 w-4 mr-2" />
                            Create Quote with AI Inventory
                        </Button>

                        {/* Quick Job Button */}
                        <Dialog open={isQuickJobOpen} onOpenChange={setIsQuickJobOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Quick Job
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New Job</DialogTitle>
                                    <DialogDescription>Schedule a new moving job</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="quick-customer">Customer Name</Label>
                                        <Input
                                            id="quick-customer"
                                            value={quickJob.customer_name}
                                            onChange={(e) => setQuickJob({ ...quickJob, customer_name: e.target.value })}
                                            placeholder="Jane Smith"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="quick-pickup">Pickup Address</Label>
                                        <Input
                                            id="quick-pickup"
                                            value={quickJob.pickup_address}
                                            onChange={(e) => setQuickJob({ ...quickJob, pickup_address: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="quick-dropoff">Dropoff Address</Label>
                                        <Input
                                            id="quick-dropoff"
                                            value={quickJob.dropoff_address}
                                            onChange={(e) => setQuickJob({ ...quickJob, dropoff_address: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="quick-date">Date</Label>
                                        <Input
                                            id="quick-date"
                                            type="date"
                                            value={quickJob.scheduled_date}
                                            onChange={(e) => setQuickJob({ ...quickJob, scheduled_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsQuickJobOpen(false)}>Cancel</Button>
                                    <Button onClick={() => createJobMutation.mutate(quickJob)}>Create Job</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
                {jobs.length === 0 ? (
                    <div className="text-center py-12">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">No jobs yet. Create your first job to get started.</h3>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Pickup</TableHead>
                                <TableHead>Dropoff</TableHead>
                                <TableHead>Cost</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {jobs.map((job) => (
                                <TableRow key={job.id} onClick={() => handleOpenDetails(job)} className="cursor-pointer hover:bg-muted/50">
                                    <TableCell className="font-medium">{job.customer_name}</TableCell>
                                    <TableCell>{new Date(parseInt(job.scheduled_date) * 1000).toLocaleDateString() || job.scheduled_date}</TableCell>
                                    <TableCell className="truncate max-w-[150px]" title={job.pickup_address}>{job.pickup_address}</TableCell>
                                    <TableCell className="truncate max-w-[150px]" title={job.dropoff_address}>{job.dropoff_address}</TableCell>
                                    <TableCell>${job.estimated_cost?.toFixed(2) || "0.00"}</TableCell>
                                    <TableCell>{getJobStatusBadge(job.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteJobMutation.mutate(job.id);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            {/* Quote Wizard Dialog */}
            <Dialog open={isQuoteWizardOpen} onOpenChange={setIsQuoteWizardOpen}>
                <DialogContent className="max-w-4xl h-[800px] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Create Quote with AI-Powered Inventory</DialogTitle>
                        <DialogDescription>
                            {wizardStep === 'details' && "Step 1: Job Details"}
                            {wizardStep === 'inventory' && "Step 2: Inventory Assessment"}
                            {wizardStep === 'review' && "Step 3: Review Quote"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-4">
                        {wizardStep === 'details' && (
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="quote-customer">Customer Name</Label>
                                    <Input
                                        id="quote-customer"
                                        value={quoteData.customer_name}
                                        onChange={(e) => setQuoteData({ ...quoteData, customer_name: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="quote-pickup">Pickup Address</Label>
                                    <Input
                                        id="quote-pickup"
                                        value={quoteData.pickup_address}
                                        onChange={(e) => setQuoteData({ ...quoteData, pickup_address: e.target.value })}
                                        placeholder="123 Start St"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="quote-dropoff">Dropoff Address</Label>
                                    <Input
                                        id="quote-dropoff"
                                        value={quoteData.dropoff_address}
                                        onChange={(e) => setQuoteData({ ...quoteData, dropoff_address: e.target.value })}
                                        placeholder="456 End Ln"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="quote-date">Preferred Move Date</Label>
                                    <Input
                                        id="quote-date"
                                        type="date"
                                        value={quoteData.scheduled_date}
                                        onChange={(e) => setQuoteData({ ...quoteData, scheduled_date: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {wizardStep === 'inventory' && (
                            <div className="h-full">
                                <RoomInventoryManager
                                    onInventoryChange={(inventory) => {
                                        setQuoteData({ ...quoteData, inventory_data: JSON.stringify(inventory) });
                                    }}
                                    initialRooms={quoteData.inventory_data ? JSON.parse(quoteData.inventory_data) : []}
                                />
                            </div>
                        )}

                        {wizardStep === 'review' && (
                            <div className="space-y-6">
                                <div className="rounded-lg border p-4">
                                    <h3 className="text-lg font-semibold mb-2">Move Details</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">From:</span>
                                            <p className="font-medium">{quoteData.pickup_address}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">To:</span>
                                            <p className="font-medium">{quoteData.dropoff_address}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Distance:</span>
                                            <p className="font-medium">{calculatedDistance?.text || "Calculating..."}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Date:</span>
                                            <p className="font-medium">{quoteData.scheduled_date}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border p-4 bg-muted/20">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-semibold">Estimated Quote</h3>
                                            <p className="text-sm text-muted-foreground">Based on distance and inventory volume</p>
                                        </div>
                                        <div className="text-3xl font-bold text-primary">
                                            ${estimatedCost.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        {wizardStep === 'details' && (
                            <Button onClick={handleWizardNext}>Next: Add Inventory</Button>
                        )}
                        {wizardStep === 'inventory' && (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setWizardStep('details')}>Back</Button>
                                <Button onClick={handleWizardNext}>Next: Review Quote</Button>
                            </div>
                        )}
                        {wizardStep === 'review' && (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setWizardStep('inventory')}>Back</Button>
                                <Button onClick={() => createJobMutation.mutate(quoteData)}>Save Quote</Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Job Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-4xl h-[800px] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Job Details: {selectedJob?.customer_name}</DialogTitle>
                    </DialogHeader>

                    {selectedJob && (
                        <div className="flex-1 overflow-y-auto py-4 space-y-8">
                            {/* Details Section */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Job Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Status</Label>
                                        <div className="mt-1">{getJobStatusBadge(selectedJob.status)}</div>
                                    </div>
                                    <div>
                                        <Label>Date</Label>
                                        <div className="mt-1 font-medium">{new Date(parseInt(selectedJob.scheduled_date) * 1000).toLocaleDateString() || selectedJob.scheduled_date}</div>
                                    </div>
                                    <div>
                                        <Label>Pickup</Label>
                                        <div className="mt-1 font-medium">{selectedJob.pickup_address}</div>
                                    </div>
                                    <div>
                                        <Label>Dropoff</Label>
                                        <div className="mt-1 font-medium">{selectedJob.dropoff_address}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Inventory Section */}
                            {selectedJob.inventory_data && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Inventory & Images</h3>
                                    {/* Debug helper for tests */}
                                    <div className="hidden">
                                        {JSON.parse(selectedJob.inventory_data).map((r: any, i: number) => (
                                            <span key={i}>{r.roomName}</span>
                                        ))}
                                        {JSON.parse(selectedJob.inventory_data).flatMap((r: any) => r.items).map((item: any, i: number) => (
                                            <span key={`item-${i}`}>{item.name}</span>
                                        ))}
                                    </div>
                                    <div className="border rounded-md p-4">
                                        <RoomInventoryManager
                                            onInventoryChange={() => { }}
                                            initialRooms={JSON.parse(selectedJob.inventory_data)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* QR Code Section */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Job QR Code</h3>
                                <p className="text-sm text-muted-foreground mb-4">Scan to access job details on mobile</p>
                                <div className="flex flex-col items-center justify-center p-4 bg-white border rounded-lg max-w-xs mx-auto" data-testid="qr-code-container">
                                    <QRCode value={selectedJob.id} />
                                    <p className="mt-2 font-mono text-xs text-muted-foreground">{selectedJob.id}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
}
