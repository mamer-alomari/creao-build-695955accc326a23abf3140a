import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type JobModel, JobStatus } from "@/sdk/database/orm/orm_job";
import { type WorkerModel, WorkerStatus, WorkerRole } from "@/sdk/database/orm/orm_worker";
import { type EquipmentModel } from "@/sdk/database/orm/orm_equipment";
import { type VehicleModel, VehicleType } from "@/sdk/database/orm/orm_vehicle";
import { JobWorkerAssignmentORM, type JobWorkerAssignmentModel } from "@/sdk/database/orm/orm_job_worker_assignment";
import { JobVehicleAssignmentORM, type JobVehicleAssignmentModel } from "@/sdk/database/orm/orm_job_vehicle_assignment";
import { JobEquipmentAllocationORM, type JobEquipmentAllocationModel } from "@/sdk/database/orm/orm_job_equipment_allocation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Clock, Truck, Hammer, Users, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function SchedulingView({ jobs, workers, equipment, vehicles, jobAssignments, vehicleAssignments, equipmentAllocations, companyId }: {
    jobs: JobModel[];
    workers: WorkerModel[];
    equipment: EquipmentModel[];
    vehicles: VehicleModel[];
    jobAssignments: JobWorkerAssignmentModel[];
    vehicleAssignments: JobVehicleAssignmentModel[];
    equipmentAllocations: JobEquipmentAllocationModel[];
    companyId: string;
}) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<JobModel | null>(null);

    // Selection State
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
    // Equipment is now a record of ID -> Quantity
    const [selectedEquipment, setSelectedEquipment] = useState<Record<string, number>>({});

    const queryClient = useQueryClient();

    // -- Mutations --

    const updateAssignmentsMutation = useMutation({
        mutationFn: async () => {
            if (!editingJob) return;

            const jobId = editingJob.id;

            // 1. Workers
            const currentWorkerAssignments = jobAssignments.filter(a => a.job_id === jobId);
            const currentWorkerIds = currentWorkerAssignments.map(a => a.worker_id);

            const workersToAdd = selectedWorkerIds.filter(id => !currentWorkerIds.includes(id));
            const workersToRemove = currentWorkerAssignments.filter(a => !selectedWorkerIds.includes(a.worker_id));

            if (workersToAdd.length > 0) {
                await JobWorkerAssignmentORM.getInstance().insertJobWorkerAssignment(
                    workersToAdd.map(workerId => ({ job_id: jobId, worker_id: workerId, company_id: companyId } as JobWorkerAssignmentModel))
                );
            }
            if (workersToRemove.length > 0) {
                await JobWorkerAssignmentORM.getInstance().deleteJobWorkerAssignmentByIDs(workersToRemove.map(a => a.id));
            }

            // 2. Vehicles
            const currentVehicleAssignments = vehicleAssignments.filter(a => a.job_id === jobId);
            const currentVehicleIds = currentVehicleAssignments.map(a => a.vehicle_id);

            const vehiclesToAdd = selectedVehicleIds.filter(id => !currentVehicleIds.includes(id));
            const vehiclesToRemove = currentVehicleAssignments.filter(a => !selectedVehicleIds.includes(a.vehicle_id));

            if (vehiclesToAdd.length > 0) {
                await JobVehicleAssignmentORM.getInstance().insertJobVehicleAssignment(
                    vehiclesToAdd.map(vehicleId => ({ job_id: jobId, vehicle_id: vehicleId, company_id: companyId } as JobVehicleAssignmentModel))
                );
            }
            if (vehiclesToRemove.length > 0) {
                await JobVehicleAssignmentORM.getInstance().deleteJobVehicleAssignmentByIDs(vehiclesToRemove.map(a => a.id));
            }

            // 3. Equipment
            const currentEquipmentAllocations = equipmentAllocations.filter(a => a.job_id === jobId);
            const currentAllocationMap = new Map(currentEquipmentAllocations.map(a => [a.equipment_id, a]));

            const newEquipmentIds = Object.keys(selectedEquipment);

            const equipmentToInsert = newEquipmentIds.filter(id => !currentAllocationMap.has(id));
            // Update if quantity changed
            const equipmentToUpdate = newEquipmentIds.filter(id => {
                const current = currentAllocationMap.get(id);
                return current && current.quantity_assigned !== selectedEquipment[id];
            });
            // Delete if not in new selection
            const equipmentToDelete = currentEquipmentAllocations.filter(a => !selectedEquipment[a.equipment_id]);

            if (equipmentToInsert.length > 0) {
                await JobEquipmentAllocationORM.getInstance().insertJobEquipmentAllocation(
                    equipmentToInsert.map(equipId => ({
                        job_id: jobId,
                        equipment_id: equipId,
                        quantity_assigned: selectedEquipment[equipId],
                        company_id: companyId
                    } as JobEquipmentAllocationModel))
                );
            }

            if (equipmentToUpdate.length > 0) {
                await Promise.all(equipmentToUpdate.map(equipId => {
                    const allocation = currentAllocationMap.get(equipId)!;
                    return JobEquipmentAllocationORM.getInstance().setJobEquipmentAllocationById(allocation.id, {
                        ...allocation,
                        quantity_assigned: selectedEquipment[equipId]
                    });
                }));
            }

            if (equipmentToDelete.length > 0) {
                await JobEquipmentAllocationORM.getInstance().deleteJobEquipmentAllocationByIDs(equipmentToDelete.map(a => a.id));
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["jobAssignments"] });
            queryClient.invalidateQueries({ queryKey: ["vehicleAssignments"] });
            queryClient.invalidateQueries({ queryKey: ["equipmentAllocations"] });
            setIsDialogOpen(false);
            setEditingJob(null);
        },
    });

    const handleOpenDialog = (job: JobModel) => {
        setEditingJob(job);

        // Pre-fill selections
        const jobWorkerIds = jobAssignments
            .filter(a => a.job_id === job.id)
            .map(a => a.worker_id);
        setSelectedWorkerIds(jobWorkerIds);

        const jobVehicleIds = vehicleAssignments
            .filter(a => a.job_id === job.id)
            .map(a => a.vehicle_id);
        setSelectedVehicleIds(jobVehicleIds);

        const jobAllocations = equipmentAllocations.filter(a => a.job_id === job.id);
        const equipMap: Record<string, number> = {};
        jobAllocations.forEach(a => {
            equipMap[a.equipment_id] = a.quantity_assigned;
        });
        setSelectedEquipment(equipMap);

        setIsDialogOpen(true);
    };

    const handleToggleWorker = (workerId: string) => {
        setSelectedWorkerIds(prev =>
            prev.includes(workerId) ? prev.filter(id => id !== workerId) : [...prev, workerId]
        );
    };

    const handleToggleVehicle = (vehicleId: string) => {
        setSelectedVehicleIds(prev =>
            prev.includes(vehicleId) ? prev.filter(id => id !== vehicleId) : [...prev, vehicleId]
        );
    };

    const handleToggleEquipment = (equipmentId: string) => {
        setSelectedEquipment(prev => {
            const next = { ...prev };
            if (next[equipmentId]) {
                delete next[equipmentId];
            } else {
                next[equipmentId] = 1; // Default to 1
            }
            return next;
        });
    };

    const handleQuantityChange = (equipmentId: string, quantity: number, max: number) => {
        if (quantity < 1) quantity = 1;
        if (quantity > max) quantity = max;

        setSelectedEquipment(prev => ({
            ...prev,
            [equipmentId]: quantity
        }));
    };

    const activeJobs = jobs.filter((j: JobModel) => j.status === JobStatus.Booked || j.status === JobStatus.InProgress);

    // Helpers for display
    const getWorkerName = (id: string) => workers.find(w => w.id === id)?.full_name || "Unknown";
    const getVehicleName = (id: string) => vehicles.find(v => v.id === id)?.vehicle_name || "Unknown";
    const getEquipmentName = (id: string) => equipment.find(e => e.id === id)?.name || "Unknown";

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Job Scheduling</CardTitle>
                    <CardDescription>Manage daily job assignments</CardDescription>
                </CardHeader>
                <CardContent>
                    {activeJobs.length === 0 ? (
                        <div className="text-center py-12">
                            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No active jobs to schedule.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {activeJobs.map(job => {
                                const myWorkers = jobAssignments.filter(a => a.job_id === job.id);
                                const myVehicles = vehicleAssignments.filter(a => a.job_id === job.id);
                                const myEquipment = equipmentAllocations.filter(a => a.job_id === job.id);

                                return (
                                    <Card key={job.id} className="overflow-hidden">
                                        <CardHeader className="bg-muted/30 pb-4">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        {job.customer_name}
                                                        <Badge variant={job.status === JobStatus.Booked ? "default" : "secondary"}>
                                                            {job.status === JobStatus.Booked ? "Booked" : "In Progress"}
                                                        </Badge>
                                                    </CardTitle>
                                                    <div className="flex items-center text-sm text-muted-foreground gap-4">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {new Date(parseInt(job.scheduled_date) * 1000).toLocaleDateString()}
                                                        </span>
                                                        <span>
                                                            {job.pickup_address} <span className="text-muted-foreground/50">→</span> {job.dropoff_address}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button onClick={() => handleOpenDialog(job)}>
                                                    Manage Resources
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-6">
                                            <div className="grid md:grid-cols-3 gap-6">
                                                {/* Workers Section */}
                                                <div>
                                                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                                        <Users className="h-4 w-4 text-muted-foreground" />
                                                        Workers
                                                    </h4>
                                                    {myWorkers.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground italic">None assigned</p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {myWorkers.map(a => (
                                                                <Badge key={a.id} variant="outline">{getWorkerName(a.worker_id)}</Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Vehicles Section */}
                                                <div>
                                                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                                        <Truck className="h-4 w-4 text-muted-foreground" />
                                                        Vehicles
                                                    </h4>
                                                    {myVehicles.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground italic">None assigned</p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {myVehicles.map(a => (
                                                                <Badge key={a.id} variant="secondary">{getVehicleName(a.vehicle_id)}</Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Equipment Section */}
                                                <div>
                                                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                                        <Hammer className="h-4 w-4 text-muted-foreground" />
                                                        Equipment
                                                    </h4>
                                                    {myEquipment.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground italic">None assigned</p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {myEquipment.map(a => (
                                                                <Badge key={a.id} variant="outline" className="border-dashed">
                                                                    {getEquipmentName(a.equipment_id)}
                                                                    <span className="ml-1 text-muted-foreground border-l pl-1">x{a.quantity_assigned}</span>
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsDialogOpen(false);
                    setEditingJob(null);
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Manage Resources</DialogTitle>
                        <DialogDescription>
                            Assign workers, vehicles, and equipment for {editingJob?.customer_name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-[500px] pr-4">
                            <div className="grid md:grid-cols-3 gap-6">
                                {/* Workers Column */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 font-medium pb-2 border-b">
                                        <Users className="h-4 w-4" />
                                        Workers
                                        <Badge variant="secondary" className="ml-auto">{selectedWorkerIds.length}</Badge>
                                    </div>
                                    <div className="space-y-2">
                                        {workers.filter(w => w.status === WorkerStatus.Active).map(worker => (
                                            <div key={worker.id} className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md">
                                                <Checkbox
                                                    id={`w-${worker.id}`}
                                                    checked={selectedWorkerIds.includes(worker.id)}
                                                    onCheckedChange={() => handleToggleWorker(worker.id)}
                                                />
                                                <div className="grid gap-1.5 leading-none">
                                                    <Label htmlFor={`w-${worker.id}`} className="cursor-pointer font-medium">
                                                        {worker.full_name}
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground">{WorkerRole[worker.role]}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Vehicles Column */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 font-medium pb-2 border-b">
                                        <Truck className="h-4 w-4" />
                                        Vehicles
                                        <Badge variant="secondary" className="ml-auto">{selectedVehicleIds.length}</Badge>
                                    </div>
                                    <div className="space-y-2">
                                        {vehicles.map(vehicle => (
                                            <div key={vehicle.id} className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md">
                                                <Checkbox
                                                    id={`v-${vehicle.id}`}
                                                    checked={selectedVehicleIds.includes(vehicle.id)}
                                                    onCheckedChange={() => handleToggleVehicle(vehicle.id)}
                                                />
                                                <div className="grid gap-1.5 leading-none">
                                                    <Label htmlFor={`v-${vehicle.id}`} className="cursor-pointer font-medium">
                                                        {vehicle.vehicle_name}
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground">{VehicleType[vehicle.type]}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Equipment Column */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 font-medium pb-2 border-b">
                                        <Hammer className="h-4 w-4" />
                                        Equipment
                                        <Badge variant="secondary" className="ml-auto">{Object.keys(selectedEquipment).length}</Badge>
                                    </div>
                                    <div className="space-y-2">
                                        {equipment.map(equip => {
                                            const isSelected = !!selectedEquipment[equip.id];
                                            const quantity = selectedEquipment[equip.id] || 0;

                                            return (
                                                <div key={equip.id} className="flex flex-col gap-2 p-2 hover:bg-muted/50 rounded-md">
                                                    <div className="flex items-start space-x-3">
                                                        <Checkbox
                                                            id={`e-${equip.id}`}
                                                            checked={isSelected}
                                                            onCheckedChange={() => handleToggleEquipment(equip.id)}
                                                        />
                                                        <div className="grid gap-1.5 leading-none flex-1">
                                                            <div className="flex justify-between">
                                                                <Label htmlFor={`e-${equip.id}`} className="cursor-pointer font-medium">
                                                                    {equip.name}
                                                                </Label>
                                                                <span className="text-xs text-muted-foreground">Max: {equip.total_quantity}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isSelected && (
                                                        <div className="pl-7 mt-1 animate-in slide-in-from-top-2 fade-in">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-muted-foreground">Qty:</span>
                                                                <Input
                                                                    type="number"
                                                                    value={quantity}
                                                                    min={1}
                                                                    max={equip.total_quantity}
                                                                    onChange={(e) => handleQuantityChange(equip.id, parseInt(e.target.value) || 0, equip.total_quantity)}
                                                                    className="h-8 w-20"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>

                    <DialogFooter className="pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={() => updateAssignmentsMutation.mutate()} disabled={updateAssignmentsMutation.isPending}>
                            {updateAssignmentsMutation.isPending ? "Saving..." : "Save Assignments"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
