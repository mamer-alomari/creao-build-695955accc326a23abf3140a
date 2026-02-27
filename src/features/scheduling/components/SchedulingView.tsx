import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type JobModel, JobStatus } from "@/sdk/database/orm/orm_job";
import { type WorkerModel, WorkerStatus, WorkerRole } from "@/sdk/database/orm/orm_worker";
import { type EquipmentModel, EquipmentType } from "@/sdk/database/orm/orm_equipment";
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
import { Plus, Trash2, Clock, Truck, Hammer, Users, Calendar, Box, Repeat, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { addMonths, subMonths, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());

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
    const getEquipment = (id: string) => equipment.find(e => e.id === id);
    const getEquipmentName = (id: string) => getEquipment(id)?.name || "Unknown";

    // Calendar Helpers
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate
    });

    const parseJobDate = (dateStr: string): Date => {
        if (!dateStr) return new Date();
        const parsedInt = parseInt(dateStr, 10);
        // DB might store Unix timestamps as strings. > 1,000,000,000 means it's > Sep 2001
        if (!isNaN(parsedInt) && parsedInt > 1000000000) {
            return new Date(parsedInt * 1000);
        }
        // DB might store ISO string dates or "YYYY-MM-DD"
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;
        return new Date();
    };

    // ─── Conflict Detection ───
    const getJobDate = (job: JobModel) => {
        return parseJobDate(job.scheduled_date).toDateString();
    };

    const conflicts = useMemo(() => {
        if (!editingJob) return { workers: new Map<string, string[]>(), vehicles: new Map<string, string[]>() };

        const editDate = getJobDate(editingJob);
        const sameDate = activeJobs.filter(j => j.id !== editingJob.id && getJobDate(j) === editDate);

        const workerConflicts = new Map<string, string[]>();
        const vehicleConflicts = new Map<string, string[]>();

        sameDate.forEach(otherJob => {
            jobAssignments.filter(a => a.job_id === otherJob.id).forEach(a => {
                const existing = workerConflicts.get(a.worker_id) || [];
                existing.push(otherJob.customer_name);
                workerConflicts.set(a.worker_id, existing);
            });
            vehicleAssignments.filter(a => a.job_id === otherJob.id).forEach(a => {
                const existing = vehicleConflicts.get(a.vehicle_id) || [];
                existing.push(otherJob.customer_name);
                vehicleConflicts.set(a.vehicle_id, existing);
            });
        });

        return { workers: workerConflicts, vehicles: vehicleConflicts };
    }, [editingJob, activeJobs, jobAssignments, vehicleAssignments]);

    const hasActiveConflicts = useMemo(() => {
        if (!editingJob) return false;
        for (const wId of selectedWorkerIds) {
            if (conflicts.workers.has(wId)) return true;
        }
        for (const vId of selectedVehicleIds) {
            if (conflicts.vehicles.has(vId)) return true;
        }
        return false;
    }, [selectedWorkerIds, selectedVehicleIds, conflicts, editingJob]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div className="space-y-1">
                        <CardTitle>Job Scheduling</CardTitle>
                        <CardDescription>Manage daily job assignments</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="icon" onClick={prevMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h2 className="text-lg font-semibold w-[150px] text-center">
                            {format(currentMonth, "MMMM yyyy")}
                        </h2>
                        <Button variant="outline" size="icon" onClick={nextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border bg-card">
                        <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-sm font-medium">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                                <div key={day} className={`p-2 ${i < 6 ? 'border-r' : ''}`}>
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 text-sm auto-rows-fr">
                            {calendarDays.map((day, dayIdx) => {
                                const isCurrentMonth = isSameMonth(day, currentMonth);
                                const isToday = isSameDay(day, new Date());

                                // Find jobs for this day
                                const dayJobs = activeJobs.filter(j => {
                                    const jobDate = parseJobDate(j.scheduled_date);
                                    return isSameDay(jobDate, day);
                                });

                                return (
                                    <div
                                        key={day.toString()}
                                        className={`
                                            min-h-[140px] p-2 border-b last:border-b-0 relative
                                            ${!isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-background'}
                                            ${dayIdx % 7 !== 6 ? 'border-r' : ''}
                                            ${dayIdx >= calendarDays.length - 7 ? 'border-b-0' : ''}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`
                                                flex h-6 w-6 items-center justify-center rounded-full text-xs
                                                ${isToday ? 'bg-primary text-primary-foreground font-semibold' : 'font-medium'}
                                            `}>
                                                {format(day, 'd')}
                                            </span>
                                            {dayJobs.length > 0 && (
                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 opacity-80">
                                                    {dayJobs.length} {dayJobs.length === 1 ? 'Job' : 'Jobs'}
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="space-y-1.5 overflow-y-auto max-h-[100px] scrollbar-hide">
                                            {dayJobs.map(job => {
                                                const wCount = jobAssignments.filter(a => a.job_id === job.id).length;
                                                const vCount = vehicleAssignments.filter(a => a.job_id === job.id).length;
                                                // Simplified conflict check for the calendar pill display (using full conflict object logic could be expensive)
                                                // Assuming we just want to open the dialog for detailed conflict warnings

                                                return (
                                                    <div
                                                        key={job.id}
                                                        onClick={() => handleOpenDialog(job)}
                                                        className={`
                                                            group relative cursor-pointer rounded-md border p-1.5 text-xs transition-colors hover:bg-muted font-medium
                                                            ${job.status === JobStatus.InProgress ? 'bg-blue-50/50 border-blue-200 hover:bg-blue-100/50 dark:bg-blue-900/10 dark:border-blue-800' : 'bg-card'}
                                                        `}
                                                    >
                                                        <div className="truncate pr-1">
                                                            {job.customer_name}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                                                            <span className="flex items-center gap-0.5" title="Workers Assigned">
                                                                <Users className="h-3 w-3" /> {wCount}
                                                            </span>
                                                            <span className="flex items-center gap-0.5" title="Vehicles Assigned">
                                                                <Truck className="h-3 w-3" /> {vCount}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
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

                    {hasActiveConflicts && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span><strong>Scheduling conflict:</strong> Some selected resources are already assigned to other jobs on this date.</span>
                        </div>
                    )}

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
                                            <div key={worker.id} className={`flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md ${conflicts.workers.has(worker.id) && selectedWorkerIds.includes(worker.id) ? 'bg-amber-50 border border-amber-200' : ''}`}>
                                                <Checkbox
                                                    id={`w - ${worker.id} `}
                                                    checked={selectedWorkerIds.includes(worker.id)}
                                                    onCheckedChange={() => handleToggleWorker(worker.id)}
                                                />
                                                <div className="grid gap-1.5 leading-none">
                                                    <Label htmlFor={`w - ${worker.id} `} className="cursor-pointer font-medium flex items-center gap-1">
                                                        {worker.full_name}
                                                        {conflicts.workers.has(worker.id) && (
                                                            <span title={`Also on: ${conflicts.workers.get(worker.id)!.join(', ')}`}>
                                                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                                            </span>
                                                        )}
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground">{WorkerRole[worker.role]}</p>
                                                    {conflicts.workers.has(worker.id) && (
                                                        <p className="text-xs text-amber-600">Also assigned to: {conflicts.workers.get(worker.id)!.join(', ')}</p>
                                                    )}
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
                                            <div key={vehicle.id} className={`flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md ${conflicts.vehicles.has(vehicle.id) && selectedVehicleIds.includes(vehicle.id) ? 'bg-amber-50 border border-amber-200' : ''}`}>
                                                <Checkbox
                                                    id={`v - ${vehicle.id} `}
                                                    checked={selectedVehicleIds.includes(vehicle.id)}
                                                    onCheckedChange={() => handleToggleVehicle(vehicle.id)}
                                                />
                                                <div className="grid gap-1.5 leading-none">
                                                    <Label htmlFor={`v - ${vehicle.id} `} className="cursor-pointer font-medium flex items-center gap-1">
                                                        {vehicle.vehicle_name}
                                                        {conflicts.vehicles.has(vehicle.id) && (
                                                            <span title={`Also on: ${conflicts.vehicles.get(vehicle.id)!.join(', ')}`}>
                                                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                                            </span>
                                                        )}
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground">{VehicleType[vehicle.type]}</p>
                                                    {conflicts.vehicles.has(vehicle.id) && (
                                                        <p className="text-xs text-amber-600">Also assigned to: {conflicts.vehicles.get(vehicle.id)!.join(', ')}</p>
                                                    )}
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
                                                            id={`e - ${equip.id} `}
                                                            checked={isSelected}
                                                            onCheckedChange={() => handleToggleEquipment(equip.id)}
                                                        />
                                                        <div className="grid gap-1.5 leading-none flex-1">
                                                            <div className="flex justify-between items-center">
                                                                <Label htmlFor={`e - ${equip.id} `} className="cursor-pointer font-medium flex items-center gap-2">
                                                                    {equip.name}
                                                                    {equip.type === EquipmentType.Consumable ? <Box className="h-3 w-3 text-muted-foreground" /> : <Repeat className="h-3 w-3 text-muted-foreground" />}
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
