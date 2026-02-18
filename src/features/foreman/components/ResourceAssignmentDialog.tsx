
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkerORM, WorkerStatus, WorkerRole } from "@/sdk/database/orm/orm_worker";
import { JobWorkerAssignmentORM } from "@/sdk/database/orm/orm_job_worker_assignment";
import { VehicleORM } from "@/sdk/database/orm/orm_vehicle";
import { JobVehicleAssignmentORM } from "@/sdk/database/orm/orm_job_vehicle_assignment";
import { EquipmentORM, type EquipmentModel } from "@/sdk/database/orm/orm_equipment";
import { JobEquipmentAllocationORM } from "@/sdk/database/orm/orm_job_equipment_allocation";
import { useCreaoAuth } from "@/sdk/core/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Truck, Users, Package } from "lucide-react";

interface ResourceAssignmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    jobTitle: string;
}

export function ResourceAssignmentDialog({ isOpen, onClose, jobId, jobTitle }: ResourceAssignmentDialogProps) {
    const { companyId } = useCreaoAuth();
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);

    // Selection States
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
    // Equipment State: ID -> Quantity
    const [selectedEquipment, setSelectedEquipment] = useState<Record<string, number>>({});

    // --- FETCH RESOURCES ---
    const { data: workers = [] } = useQuery({
        queryKey: ["workers", companyId],
        enabled: !!companyId && isOpen,
        queryFn: async () => {
            if (!companyId) return [];
            return await WorkerORM.getInstance().getWorkersByCompanyId(companyId);
        }
    });

    const { data: vehicles = [] } = useQuery({
        queryKey: ["vehicles", companyId],
        enabled: !!companyId && isOpen,
        queryFn: async () => {
            if (!companyId) return [];
            return await VehicleORM.getInstance().getVehiclesByCompanyId(companyId);
        }
    });

    const { data: equipment = [] } = useQuery({
        queryKey: ["equipment", companyId],
        enabled: !!companyId && isOpen,
        queryFn: async () => {
            if (!companyId) return [];
            return await EquipmentORM.getInstance().getEquipmentByCompanyId(companyId);
        }
    });

    // --- FETCH CURRENT ASSIGNMENTS ---
    const { data: workerAssignments } = useQuery({
        queryKey: ["job-assignments", jobId],
        enabled: !!jobId && isOpen && !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            return await JobWorkerAssignmentORM.getInstance().getJobWorkerAssignmentByJobId(jobId, companyId);
        }
    });

    const { data: vehicleAssignments } = useQuery({
        queryKey: ["job-vehicle-assignments", jobId],
        enabled: !!jobId && isOpen && !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            return await JobVehicleAssignmentORM.getInstance().getJobVehicleAssignmentByJobId(jobId, companyId);
        }
    });

    const { data: equipmentAllocations } = useQuery({
        queryKey: ["job-equipment-allocations", jobId],
        enabled: !!jobId && isOpen && !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            return await JobEquipmentAllocationORM.getInstance().getJobEquipmentAllocationByJobId(jobId, companyId);
        }
    });

    // Sync State
    useEffect(() => {
        if (workerAssignments) setSelectedWorkerIds(workerAssignments.map(a => a.worker_id));
        else setSelectedWorkerIds([]);

        if (vehicleAssignments) setSelectedVehicleIds(vehicleAssignments.map(a => a.vehicle_id));
        else setSelectedVehicleIds([]);

        if (equipmentAllocations) {
            const equipMap: Record<string, number> = {};
            equipmentAllocations.forEach(a => {
                equipMap[a.equipment_id] = a.quantity_assigned || 1;
            });
            setSelectedEquipment(equipMap);
        } else {
            setSelectedEquipment({});
        }
    }, [workerAssignments, vehicleAssignments, equipmentAllocations]);


    // --- SAVE MUTATION ---
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!companyId) throw new Error("No company ID");
            setIsSaving(true);

            // 1. Save Workers
            const workerORM = JobWorkerAssignmentORM.getInstance();
            await workerORM.deleteJobWorkerAssignmentByJobId(jobId, companyId);
            if (selectedWorkerIds.length > 0) {
                await workerORM.insertJobWorkerAssignment(selectedWorkerIds.map(wid => ({
                    company_id: companyId,
                    job_id: jobId,
                    worker_id: wid,
                } as any)));
            }

            // 2. Save Vehicles
            const vehicleORM = JobVehicleAssignmentORM.getInstance();
            await vehicleORM.deleteJobVehicleAssignmentByJobId(jobId, companyId);
            if (selectedVehicleIds.length > 0) {
                await vehicleORM.insertJobVehicleAssignment(selectedVehicleIds.map(vid => ({
                    company_id: companyId,
                    job_id: jobId,
                    vehicle_id: vid,
                } as any)));
            }

            // 3. Save Equipment & Update Inventory
            const role = localStorage.getItem("role") || "foreman"; // Just for context, though logic is backend/ORM

            const equipORM = JobEquipmentAllocationORM.getInstance();
            const mainEquipORM = EquipmentORM.getInstance();

            // Calculate Diffs for Inventory Update
            // Map: ID -> OldQty
            const oldQtyMap: Record<string, number> = {};
            if (equipmentAllocations) {
                equipmentAllocations.forEach(a => oldQtyMap[a.equipment_id] = a.quantity_assigned);
            }

            // Unique IDs involved (Old + New)
            const allInvolvedIds = new Set([...Object.keys(oldQtyMap), ...Object.keys(selectedEquipment)]);

            for (const eid of Array.from(allInvolvedIds)) {
                const oldQty = oldQtyMap[eid] || 0;
                const newQty = selectedEquipment[eid] || 0; // 0 implies unchecked/removed
                const delta = newQty - oldQty;

                if (delta !== 0) {
                    // Find actual equipment record to update total
                    // We use the 'equipment' list fetched from query as the source of truth for the object structure
                    const equipItem = equipment.find(e => e.id === eid);
                    if (equipItem) {
                        const newTotal = (equipItem.total_quantity || 0) - delta;
                        // Prevent negative inventory? (Optional, but good practice). Allowing negative for now in case of data mismatch.

                        // Update Equipment Record
                        // We clone the item and update total_quantity
                        const updatedItem: EquipmentModel = {
                            ...equipItem,
                            total_quantity: newTotal
                        };
                        await mainEquipORM.setEquipmentById(eid, updatedItem);
                    }
                }
            }

            // Update Allocations Table
            await equipORM.deleteJobEquipmentAllocationByJobId(jobId, companyId);
            const newAllocationKeys = Object.keys(selectedEquipment);
            if (newAllocationKeys.length > 0) {
                const allocationsToInsert = newAllocationKeys.map(eid => ({
                    company_id: companyId,
                    job_id: jobId,
                    equipment_id: eid,
                    quantity_assigned: selectedEquipment[eid]
                }));
                await equipORM.insertJobEquipmentAllocation(allocationsToInsert as any);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["job-assignments", jobId] });
            queryClient.invalidateQueries({ queryKey: ["job-vehicle-assignments", jobId] });
            queryClient.invalidateQueries({ queryKey: ["job-equipment-allocations", jobId] });

            // Refresh Dashboard Maps & Inventory
            queryClient.invalidateQueries({ queryKey: ["all-assignments", companyId] });
            queryClient.invalidateQueries({ queryKey: ["all-vehicle-assignments", companyId] });
            queryClient.invalidateQueries({ queryKey: ["all-equipment-allocations", companyId] });
            queryClient.invalidateQueries({ queryKey: ["equipment", companyId] }); // Important: Refresh inventory counts

            onClose();
        },
        onError: (err) => {
            console.error("Failed to save resources:", err);
            alert("Failed to save assignments.");
        },
        onSettled: () => setIsSaving(false)
    });

    const activeWorkers = workers.filter(w => w.status === WorkerStatus.Active);

    // Toggle Helpers
    const toggleWorker = (id: string) => {
        setSelectedWorkerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleVehicle = (id: string) => {
        setSelectedVehicleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleEquipment = (id: string) => {
        setSelectedEquipment(prev => {
            const next = { ...prev };
            if (next[id]) {
                delete next[id];
            } else {
                next[id] = 1; // Default to 1
            }
            return next;
        });
    };

    const updateEquipmentQty = (id: string, qty: number) => {
        if (qty < 1) return; // Minimum 1 if selected
        setSelectedEquipment(prev => ({
            ...prev,
            [id]: qty
        }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Assign Resources</DialogTitle>
                    <p className="text-sm text-muted-foreground">Manage Crew, Vehicles, and Equipment for {jobTitle}</p>
                </DialogHeader>

                <Tabs defaultValue="crew" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="crew"><Users className="w-4 h-4 mr-2" /> Crew</TabsTrigger>
                        <TabsTrigger value="vehicles"><Truck className="w-4 h-4 mr-2" /> Vehicles</TabsTrigger>
                        <TabsTrigger value="equipment"><Package className="w-4 h-4 mr-2" /> Equipment</TabsTrigger>
                    </TabsList>

                    {/* CREW TAB */}
                    <TabsContent value="crew" className="max-h-[50vh] overflow-y-auto space-y-2 p-1">
                        {activeWorkers.length === 0 ? <p className="text-muted-foreground text-center py-4">No active workers.</p> :
                            activeWorkers.map(w => (
                                <div key={w.id} className="flex items-center space-x-3 border p-3 rounded-md hover:bg-accent/50">
                                    <Checkbox
                                        id={w.id}
                                        checked={selectedWorkerIds.includes(w.id)}
                                        onCheckedChange={() => toggleWorker(w.id)}
                                    />
                                    <Label htmlFor={w.id} className="flex-1 cursor-pointer flex items-center gap-3">
                                        <Avatar className="h-8 w-8"><AvatarFallback>{w.full_name[0]}</AvatarFallback></Avatar>
                                        <div>
                                            <div className="font-medium">{w.full_name}</div>
                                            <div className="text-xs text-muted-foreground capitalize">{WorkerRole[w.role]}</div>
                                        </div>
                                    </Label>
                                </div>
                            ))
                        }
                    </TabsContent>

                    {/* VEHICLES TAB */}
                    <TabsContent value="vehicles" className="max-h-[50vh] overflow-y-auto space-y-2 p-1">
                        {vehicles.length === 0 ? <p className="text-muted-foreground text-center py-4">No vehicles found.</p> :
                            vehicles.map(v => (
                                <div key={v.id} className="flex items-center space-x-3 border p-3 rounded-md hover:bg-accent/50">
                                    <Checkbox
                                        id={v.id}
                                        checked={selectedVehicleIds.includes(v.id)}
                                        onCheckedChange={() => toggleVehicle(v.id)}
                                    />
                                    <Label htmlFor={v.id} className="flex-1 cursor-pointer">
                                        <div className="font-medium">{v.vehicle_name}</div>
                                        <div className="text-xs text-muted-foreground">Plate: {v.license_plate} | {v.type === 1 ? "16ft" : v.type === 2 ? "26ft" : "Van"}</div>
                                    </Label>
                                </div>
                            ))
                        }
                    </TabsContent>

                    {/* EQUIPMENT TAB - UPDATED FOR QUANTITY */}
                    <TabsContent value="equipment" className="max-h-[50vh] overflow-y-auto space-y-2 p-1">
                        {equipment.length === 0 ? <p className="text-muted-foreground text-center py-4">No equipment found.</p> :
                            equipment.map(e => {
                                const isSelected = !!selectedEquipment[e.id];
                                return (
                                    <div key={e.id} className={`flex items-center space-x-3 border p-3 rounded-md transition-colors ${isSelected ? 'bg-accent/20 border-accent' : 'hover:bg-accent/50'}`}>
                                        <Checkbox
                                            id={e.id}
                                            checked={isSelected}
                                            onCheckedChange={() => toggleEquipment(e.id)}
                                            className="mt-1 self-start"
                                        />
                                        <div className="flex-1 flex items-center justify-between gap-4">
                                            <Label htmlFor={e.id} className="cursor-pointer flex-1">
                                                <div className="font-medium">{e.name}</div>
                                                <div className="text-xs text-muted-foreground">In Stock: {e.total_quantity}</div>
                                            </Label>

                                            {isSelected && (
                                                <div className="flex items-center gap-2">
                                                    <Label htmlFor={`qty-${e.id}`} className="text-xs whitespace-nowrap">Qty:</Label>
                                                    <Input
                                                        id={`qty-${e.id}`}
                                                        type="number"
                                                        min="1"
                                                        className="h-8 w-20"
                                                        value={selectedEquipment[e.id]}
                                                        onChange={(ev) => updateEquipmentQty(e.id, parseInt(ev.target.value) || 1)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        }
                    </TabsContent>
                </Tabs>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={() => saveMutation.mutate()} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
