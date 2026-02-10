import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type JobModel, JobStatus } from "@/sdk/database/orm/orm_job";
import { type WorkerModel, WorkerStatus } from "@/sdk/database/orm/orm_worker";
import { type EquipmentModel } from "@/sdk/database/orm/orm_equipment";
import { type VehicleModel } from "@/sdk/database/orm/orm_vehicle";
import { JobWorkerAssignmentORM, type JobWorkerAssignmentModel } from "@/sdk/database/orm/orm_job_worker_assignment";
import { JobVehicleAssignmentORM, type JobVehicleAssignmentModel } from "@/sdk/database/orm/orm_job_vehicle_assignment";
import { JobEquipmentAllocationORM, type JobEquipmentAllocationModel } from "@/sdk/database/orm/orm_job_equipment_allocation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<string>("");
    const [resourceType, setResourceType] = useState<"worker" | "equipment" | "vehicle">("worker");
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
    const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("");
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

    const queryClient = useQueryClient();

    const assignWorkerMutation = useMutation({
        mutationFn: async ({ jobId, workerId }: { jobId: string; workerId: string }) => {
            const assignmentOrm = JobWorkerAssignmentORM.getInstance();
            await assignmentOrm.insertJobWorkerAssignment([{
                job_id: jobId,
                worker_id: workerId,
                company_id: companyId,
            } as JobWorkerAssignmentModel]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["jobAssignments"] });
            resetDialog();
        },
    });

    const assignVehicleMutation = useMutation({
        mutationFn: async ({ jobId, vehicleId }: { jobId: string; vehicleId: string }) => {
            const assignmentOrm = JobVehicleAssignmentORM.getInstance();
            await assignmentOrm.insertJobVehicleAssignment([{
                job_id: jobId,
                vehicle_id: vehicleId,
                company_id: companyId,
            } as JobVehicleAssignmentModel]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vehicleAssignments"] });
            resetDialog();
        },
    });

    const assignEquipmentMutation = useMutation({
        mutationFn: async ({ jobId, equipmentId }: { jobId: string; equipmentId: string }) => {
            const allocationOrm = JobEquipmentAllocationORM.getInstance();
            await allocationOrm.insertJobEquipmentAllocation([{
                job_id: jobId,
                equipment_id: equipmentId,
                company_id: companyId,
            } as JobEquipmentAllocationModel]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipmentAllocations"] });
            resetDialog();
        },
    });

    const removeWorkerAssignmentMutation = useMutation({
        mutationFn: async (assignmentId: string) => {
            const assignmentOrm = JobWorkerAssignmentORM.getInstance();
            await assignmentOrm.deleteJobWorkerAssignmentByIDs([assignmentId]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["jobAssignments"] });
        },
    });

    const removeVehicleAssignmentMutation = useMutation({
        mutationFn: async (assignmentId: string) => {
            const assignmentOrm = JobVehicleAssignmentORM.getInstance();
            await assignmentOrm.deleteJobVehicleAssignmentByIDs([assignmentId]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vehicleAssignments"] });
        },
    });

    const removeEquipmentAllocationMutation = useMutation({
        mutationFn: async (allocationId: string) => {
            const allocationOrm = JobEquipmentAllocationORM.getInstance();
            await allocationOrm.deleteJobEquipmentAllocationByIDs([allocationId]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipmentAllocations"] });
        },
    });

    const resetDialog = () => {
        setIsAssignDialogOpen(false);
        setSelectedJobId("");
        setSelectedWorkerId("");
        setSelectedEquipmentId("");
        setSelectedVehicleId("");
    };

    const handleAssign = () => {
        if (!selectedJobId) return;

        if (resourceType === "worker" && selectedWorkerId) {
            assignWorkerMutation.mutate({ jobId: selectedJobId, workerId: selectedWorkerId });
        } else if (resourceType === "vehicle" && selectedVehicleId) {
            assignVehicleMutation.mutate({ jobId: selectedJobId, vehicleId: selectedVehicleId });
        } else if (resourceType === "equipment" && selectedEquipmentId) {
            assignEquipmentMutation.mutate({ jobId: selectedJobId, equipmentId: selectedEquipmentId });
        }
    };

    const getWorkerName = (workerId: string) => {
        const worker = workers.find(w => w.id === workerId);
        return worker?.full_name || "Unknown Worker";
    };

    const getAssignedWorkers = (jobId: string) => {
        return jobAssignments.filter((a: JobWorkerAssignmentModel) => a.job_id === jobId);
    };

    const getAssignedVehicles = (jobId: string) => {
        return vehicleAssignments.filter((a: JobVehicleAssignmentModel) => a.job_id === jobId);
    };

    const getAssignedEquipment = (jobId: string) => {
        return equipmentAllocations.filter((a: JobEquipmentAllocationModel) => a.job_id === jobId);
    };

    const getVehicleName = (vehicleId: string) => {
        const vehicle = vehicles.find((v: VehicleModel) => v.id === vehicleId);
        return vehicle?.vehicle_name || "Unknown Vehicle";
    };

    const getEquipmentName = (equipmentId: string) => {
        const equip = equipment.find((e: EquipmentModel) => e.id === equipmentId);
        return equip?.name || "Unknown Equipment";
    };

    const activeJobs = jobs.filter((j: JobModel) => j.status === JobStatus.Booked || j.status === JobStatus.InProgress);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Job Scheduling</CardTitle>
                        <CardDescription>Assign workers, equipment, and vehicles to jobs</CardDescription>
                    </div>
                    <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Assign Resources
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Assign Resources to Job</DialogTitle>
                                <DialogDescription>Select a job and resources to create assignments</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="job">Job</Label>
                                    <Select
                                        value={selectedJobId}
                                        onValueChange={setSelectedJobId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select job" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {activeJobs.map((job) => (
                                                <SelectItem key={job.id} value={job.id}>
                                                    {job.customer_name} - {new Date(parseInt(job.scheduled_date) * 1000).toLocaleDateString()}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="resourceType">Resource Type</Label>
                                    <Select
                                        value={resourceType}
                                        onValueChange={(value) => setResourceType(value as "worker" | "equipment" | "vehicle")}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select resource type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="worker">Worker</SelectItem>
                                            <SelectItem value="equipment">Equipment</SelectItem>
                                            <SelectItem value="vehicle">Vehicle</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {resourceType === "worker" && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="worker">Worker</Label>
                                        <Select
                                            value={selectedWorkerId}
                                            onValueChange={setSelectedWorkerId}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select worker" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {workers.filter((w: WorkerModel) => w.status === WorkerStatus.Active).map((worker) => (
                                                    <SelectItem key={worker.id} value={worker.id}>
                                                        {worker.full_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {resourceType === "equipment" && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="equipment">Equipment</Label>
                                        <Select
                                            value={selectedEquipmentId}
                                            onValueChange={setSelectedEquipmentId}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select equipment" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {equipment.map((equip) => (
                                                    <SelectItem key={equip.id} value={equip.id}>
                                                        {equip.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {resourceType === "vehicle" && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="vehicle">Vehicle</Label>
                                        <Select
                                            value={selectedVehicleId}
                                            onValueChange={setSelectedVehicleId}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select vehicle" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {vehicles.map((vehicle) => (
                                                    <SelectItem key={vehicle.id} value={vehicle.id}>
                                                        {vehicle.vehicle_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={resetDialog}>Cancel</Button>
                                <Button onClick={handleAssign}>Assign Resource</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {activeJobs.length === 0 ? (
                    <div className="text-center py-12">
                        <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No active jobs to schedule. Create or book a job first.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {activeJobs.map((job) => {
                            const assignedWorkers = getAssignedWorkers(job.id);
                            const assignedVehicles = getAssignedVehicles(job.id);
                            const assignedEquipment = getAssignedEquipment(job.id);
                            const hasNoAssignments = assignedWorkers.length === 0 && assignedVehicles.length === 0 && assignedEquipment.length === 0;

                            return (
                                <Card key={job.id}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-lg">{job.customer_name}</CardTitle>
                                                <CardDescription>
                                                    {new Date(parseInt(job.scheduled_date) * 1000).toLocaleDateString()} - {job.pickup_address} → {job.dropoff_address}
                                                </CardDescription>
                                            </div>
                                            <Badge>{job.status === JobStatus.Booked ? "Booked" : "In Progress"}</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {hasNoAssignments ? (
                                            <p className="text-muted-foreground text-sm">No resources assigned yet</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {assignedWorkers.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-sm font-medium">Workers:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {assignedWorkers.map((assignment) => (
                                                                <Badge key={assignment.id} variant="outline" className="flex items-center gap-2">
                                                                    {getWorkerName(assignment.worker_id)}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-4 w-4 p-0 hover:bg-transparent"
                                                                        onClick={() => removeWorkerAssignmentMutation.mutate(assignment.id)}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {assignedVehicles.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-sm font-medium">Vehicles:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {assignedVehicles.map((assignment) => (
                                                                <Badge key={assignment.id} variant="secondary" className="flex items-center gap-2">
                                                                    {getVehicleName(assignment.vehicle_id)}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-4 w-4 p-0 hover:bg-transparent"
                                                                        onClick={() => removeVehicleAssignmentMutation.mutate(assignment.id)}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {assignedEquipment.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-sm font-medium">Equipment:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {assignedEquipment.map((allocation) => (
                                                                <Badge key={allocation.id} variant="default" className="flex items-center gap-2">
                                                                    {getEquipmentName(allocation.equipment_id)}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-4 w-4 p-0 hover:bg-transparent"
                                                                        onClick={() => removeEquipmentAllocationMutation.mutate(allocation.id)}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
