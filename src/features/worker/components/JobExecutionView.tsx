
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { JobORM, JobStatus, type JobModel } from "@/sdk/database/orm/orm_job";
import { type RoomInventory } from "@/hooks/use-google-vision";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Navigation, MapPin, Truck, CheckCircle2, Phone } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export function JobExecutionView() {
    const { jobId } = useParams({ from: "/worker/jobs/$jobId" });
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("overview");

    // Fetch Job
    const { data: job, isLoading } = useQuery({
        queryKey: ["job", jobId],
        queryFn: async () => {
            const res = await JobORM.getInstance().getJobById(jobId);
            return res[0];
        }
    });

    // Update Status Mutation
    const statusMutation = useMutation({
        mutationFn: async (newStatus: JobStatus) => {
            if (!job) return;
            await JobORM.getInstance().setJobById(job.id, { ...job, status: newStatus });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["job", jobId] });
        }
    });

    if (isLoading || !job) return <div className="p-8 text-center">Loading job details...</div>;

    // Parse Inventory
    const inventory: any[] = job.inventory_data ? JSON.parse(job.inventory_data) : [];
    const totalItems = inventory.reduce((acc, room) => acc + (room.items?.length || 0), 0);

    // Workflow Logic
    const getNextAction = () => {
        switch (job.status) {
            case JobStatus.Booked:
                return { label: "Start Job (En Route)", nextStatus: JobStatus.InProgress, color: "bg-blue-600 hover:bg-blue-700" };
            case JobStatus.InProgress:
                // For simplicity, we just have "Complete" for now. 
                // Full workflow would have more granular states (Arrived, Loading, Unloading).
                return { label: "Complete Job", nextStatus: JobStatus.Completed, color: "bg-green-600 hover:bg-green-700" };
            case JobStatus.Completed:
                return null;
            default:
                return null;
        }
    };

    const nextAction = getNextAction();

    return (
        <div className="pb-24">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/worker" })}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold">{job.customer_name}</h1>
                    <div className="text-sm text-muted-foreground">#{job.id.slice(0, 6)}</div>
                </div>
                <div className="ml-auto">
                    <JobStatusBadge status={job.status} />
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="inventory">Inventory ({totalItems})</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    {/* Maps / Directions */}
                    <div className="grid gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Route</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className="h-2 w-2 rounded-full bg-green-500 ring-4 ring-green-100" />
                                        <div className="w-0.5 h-full bg-slate-200 my-1" />
                                        <div className="h-2 w-2 rounded-full bg-red-500 ring-4 ring-red-100" />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <div className="font-medium text-lg">Pickup</div>
                                            <div className="text-slate-600">{job.pickup_address}</div>
                                            <Button variant="outline" size="sm" className="mt-2 w-full gap-2">
                                                <Navigation className="h-3 w-3" /> Get Directions
                                            </Button>
                                        </div>
                                        <div>
                                            <div className="font-medium text-lg">Dropoff</div>
                                            <div className="text-slate-600">{job.dropoff_address}</div>
                                            <Button variant="outline" size="sm" className="mt-2 w-full gap-2">
                                                <Navigation className="h-3 w-3" /> Get Directions
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                        <Phone className="h-5 w-5 text-slate-600" />
                                    </div>
                                    <div>
                                        <div className="font-medium">Call Customer</div>
                                        <div className="text-xs text-muted-foreground">Tap to dial</div>
                                    </div>
                                </div>
                                <Button variant="secondary">Call</Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Inventory Tab (Digital BOL) */}
                <TabsContent value="inventory" className="space-y-4">
                    {inventory.map((room, i) => (
                        <Card key={i}>
                            <CardHeader className="bg-slate-50 py-2">
                                <CardTitle className="text-base">{room.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {room.items.map((item: any, j: number) => (
                                    <div key={j} className="flex items-center p-3 border-b last:border-0 hover:bg-slate-50">
                                        <Checkbox className="mr-4 h-5 w-5" />
                                        <div className="flex-1">
                                            <div className="font-medium">{item.name}</div>
                                            {item.notes && <div className="text-xs text-muted-foreground">{item.notes}</div>}
                                        </div>
                                        <div className="mx-2 text-sm font-bold bg-slate-100 px-2 py-0.5 rounded">x{item.quantity}</div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>

                <TabsContent value="details">
                    <Card>
                        <CardContent className="p-4 space-y-2">
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Job ID</span>
                                <span className="font-mono">{job.id}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Scheduled</span>
                                <span>{format(new Date(job.scheduled_date), "PPP p")}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Est. Cost</span>
                                <span>${job.estimated_cost}</span>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Sticky Action Footer */}
            {nextAction && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
                    <div className="container mx-auto">
                        <Button
                            className={`w-full h-14 text-lg font-bold shadow-lg ${nextAction.color}`}
                            onClick={() => statusMutation.mutate(nextAction.nextStatus)}
                            disabled={statusMutation.isPending}
                        >
                            {statusMutation.isPending ? "Updating..." : nextAction.label}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function JobStatusBadge({ status }: { status: JobStatus }) {
    const labels: Record<number, string> = {
        [JobStatus.Unspecified]: "Wait",
        [JobStatus.Quote]: "Quote",
        [JobStatus.Booked]: "Scheduled",
        [JobStatus.InProgress]: "Active",
        [JobStatus.Completed]: "Done",
        [JobStatus.Canceled]: "Canceled",
        [JobStatus.EnRoute]: "En Route",
        [JobStatus.Arrived]: "Arrived",
        [JobStatus.Loading]: "Loading",
        [JobStatus.onWayToDropoff]: "Driving",
        [JobStatus.Unloading]: "Unloading",
    };
    return <Badge>{labels[status] || "Unknown"}</Badge>;
}
