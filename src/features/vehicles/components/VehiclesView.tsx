import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { VehicleORM, type VehicleModel, VehicleType } from "@/sdk/database/orm/orm_vehicle";
import { MaintenanceRecordORM, type MaintenanceRecordModel, MaintenanceType } from "@/sdk/database/orm/orm_maintenance_record";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Truck, Trash2, Wrench } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export function VehiclesView({ vehicles, companyId, canManageFleet = true }: { vehicles: VehicleModel[]; companyId: string; canManageFleet?: boolean }) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleModel | null>(null);
    const [isMaintenanceSheetOpen, setIsMaintenanceSheetOpen] = useState(false);

    const [newVehicle, setNewVehicle] = useState<Partial<VehicleModel>>({
        vehicle_name: "",
        license_plate: "",
        type: VehicleType.BoxTruck16ft,
        capacity_cft: 0,
    });

    const [newMaintenanceRecord, setNewMaintenanceRecord] = useState<Partial<MaintenanceRecordModel>>({
        service_date: format(new Date(), "yyyy-MM-dd"),
        description: "",
        cost: 0,
        performed_by: "",
        odometer_reading: 0,
        type: MaintenanceType.Routine,
        notes: "",
    });

    const queryClient = useQueryClient();

    const { data: maintenanceRecords } = useQuery({
        queryKey: ["maintenance", selectedVehicle?.id],
        queryFn: async () => {
            if (!selectedVehicle) return [];
            const maintenanceOrm = MaintenanceRecordORM.getInstance();
            const records = await maintenanceOrm.getAllMaintenanceRecord();
            return records.filter(r => r.vehicle_id === selectedVehicle.id);
        },
        enabled: !!selectedVehicle,
    });

    const createVehicleMutation = useMutation({
        mutationFn: async (vehicle: Partial<VehicleModel>) => {
            const vehicleOrm = VehicleORM.getInstance();
            return await vehicleOrm.insertVehicle([{
                ...vehicle,
                company_id: companyId,
            } as VehicleModel]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vehicles"] });
            setIsCreateDialogOpen(false);
            setNewVehicle({
                vehicle_name: "",
                license_plate: "",
                type: VehicleType.BoxTruck16ft,
                capacity_cft: 0,
            });
        },
    });

    const deleteVehicleMutation = useMutation({
        mutationFn: async (vehicleId: string) => {
            const vehicleOrm = VehicleORM.getInstance();
            await vehicleOrm.deleteVehicleByIDs([vehicleId]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vehicles"] });
        },
    });

    const createMaintenanceMutation = useMutation({
        mutationFn: async (record: Partial<MaintenanceRecordModel>) => {
            if (!selectedVehicle) throw new Error("No vehicle selected");
            if (!companyId) throw new Error("No company ID provided");

            const maintenanceOrm = MaintenanceRecordORM.getInstance();
            return await maintenanceOrm.insertMaintenanceRecord([{
                ...record,
                vehicle_id: selectedVehicle.id,
                company_id: companyId,
            } as MaintenanceRecordModel]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["maintenance", selectedVehicle?.id] });
            setNewMaintenanceRecord({
                service_date: format(new Date(), "yyyy-MM-dd"),
                description: "",
                cost: 0,
                performed_by: "",
                odometer_reading: 0,
                type: MaintenanceType.Routine,
                notes: "",
            });
            toast.success("Record added successfully!");
        },
        onError: (error) => {
            console.error("Failed to create maintenance record:", error);
            toast.error(`Failed to add record: ${error.message}`);
        }
    });

    const getVehicleTypeLabel = (type: VehicleType) => {
        const labels: Record<VehicleType, string> = {
            [VehicleType.Unspecified]: "Unspecified",
            [VehicleType.BoxTruck16ft]: "Box Truck 16ft",
            [VehicleType.BoxTruck26ft]: "Box Truck 26ft",
            [VehicleType.CargoVan]: "Cargo Van",
            [VehicleType.Flatbed]: "Flatbed",
        };
        return labels[type];
    };

    const getMaintenanceTypeLabel = (type: MaintenanceType) => {
        const labels: Record<MaintenanceType, string> = {
            [MaintenanceType.Unspecified]: "Unspecified",
            [MaintenanceType.Routine]: "Routine",
            [MaintenanceType.Repair]: "Repair",
            [MaintenanceType.Inspection]: "Inspection",
            [MaintenanceType.Upgrade]: "Upgrade",
        };
        return labels[type];
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Vehicles Management</CardTitle>
                        <CardDescription>Manage your fleet of moving vehicles</CardDescription>
                    </div>
                    {canManageFleet && (
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Vehicle
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                {/* ... (dialog content) ... */}
                                <DialogHeader>
                                    <DialogTitle>Create New Vehicle</DialogTitle>
                                    <DialogDescription>Add a new vehicle to your fleet</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="vehicle_name">Vehicle Name</Label>
                                        <Input
                                            id="vehicle_name"
                                            value={newVehicle.vehicle_name}
                                            onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_name: e.target.value })}
                                            placeholder="Truck 1"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="license_plate">License Plate</Label>
                                        <Input
                                            id="license_plate"
                                            value={newVehicle.license_plate}
                                            onChange={(e) => setNewVehicle({ ...newVehicle, license_plate: e.target.value })}
                                            placeholder="ABC-1234"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="type">Vehicle Type</Label>
                                        <Select
                                            value={newVehicle.type?.toString()}
                                            onValueChange={(value) => setNewVehicle({ ...newVehicle, type: parseInt(value) as VehicleType })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={VehicleType.BoxTruck16ft.toString()}>Box Truck 16ft</SelectItem>
                                                <SelectItem value={VehicleType.BoxTruck26ft.toString()}>Box Truck 26ft</SelectItem>
                                                <SelectItem value={VehicleType.CargoVan.toString()}>Cargo Van</SelectItem>
                                                <SelectItem value={VehicleType.Flatbed.toString()}>Flatbed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="capacity_cft">Capacity (cubic feet)</Label>
                                        <Input
                                            id="capacity_cft"
                                            type="number"
                                            value={newVehicle.capacity_cft || ""}
                                            onChange={(e) => setNewVehicle({ ...newVehicle, capacity_cft: parseFloat(e.target.value) || 0 })}
                                            placeholder="1000"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={() => createVehicleMutation.mutate(newVehicle)}>Create Vehicle</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {vehicles.length === 0 ? (
                    <div className="text-center py-12">
                        <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No vehicles yet.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>License Plate</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Capacity (cu ft)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vehicles.map((vehicle) => (
                                <TableRow key={vehicle.id}>
                                    <TableCell className="font-medium">{vehicle.vehicle_name}</TableCell>
                                    <TableCell>{vehicle.license_plate}</TableCell>
                                    <TableCell>{getVehicleTypeLabel(vehicle.type)}</TableCell>
                                    <TableCell className="text-right">{vehicle.capacity_cft || "-"}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => {
                                                setSelectedVehicle(vehicle);
                                                setIsMaintenanceSheetOpen(true);
                                            }}>
                                                <Wrench className="h-4 w-4" />
                                            </Button>
                                            {canManageFleet && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => deleteVehicleMutation.mutate(vehicle.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <Sheet open={isMaintenanceSheetOpen} onOpenChange={(open) => {
                setIsMaintenanceSheetOpen(open);
                if (!open) {
                    setSelectedVehicle(null);
                    setNewMaintenanceRecord({
                        service_date: format(new Date(), "yyyy-MM-dd"),
                        description: "",
                        cost: 0,
                        performed_by: "",
                        odometer_reading: 0,
                        type: MaintenanceType.Routine,
                        notes: "",
                    });
                }
            }}>
                <SheetContent className="overflow-y-auto sm:max-w-xl">
                    <SheetHeader>
                        <SheetTitle>Maintenance Records</SheetTitle>
                        <SheetDescription>
                            Maintenance history for {selectedVehicle?.vehicle_name} ({selectedVehicle?.license_plate})
                        </SheetDescription>
                    </SheetHeader>

                    <div className="py-6 space-y-6">
                        {/* Add New Record Form */}
                        <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                            <h3 className="font-semibold text-sm">Add Maintenance Log</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="m_date">Date</Label>
                                    <Input
                                        id="m_date"
                                        type="date"
                                        value={newMaintenanceRecord.service_date}
                                        onChange={(e) => setNewMaintenanceRecord({ ...newMaintenanceRecord, service_date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="m_type">Type</Label>
                                    <Select
                                        value={newMaintenanceRecord.type?.toString()}
                                        onValueChange={(value) => setNewMaintenanceRecord({ ...newMaintenanceRecord, type: parseInt(value) as MaintenanceType })}
                                    >
                                        <SelectTrigger id="m_type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={MaintenanceType.Routine.toString()}>Routine</SelectItem>
                                            <SelectItem value={MaintenanceType.Repair.toString()}>Repair</SelectItem>
                                            <SelectItem value={MaintenanceType.Inspection.toString()}>Inspection</SelectItem>
                                            <SelectItem value={MaintenanceType.Upgrade.toString()}>Upgrade</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="m_desc">Description</Label>
                                <Input
                                    id="m_desc"
                                    value={newMaintenanceRecord.description}
                                    onChange={(e) => setNewMaintenanceRecord({ ...newMaintenanceRecord, description: e.target.value })}
                                    placeholder="Oil change, brake pad replacement..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="m_cost">Cost ($)</Label>
                                    <Input
                                        id="m_cost"
                                        type="number"
                                        value={newMaintenanceRecord.cost}
                                        onChange={(e) => setNewMaintenanceRecord({ ...newMaintenanceRecord, cost: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="m_odo">Odometer</Label>
                                    <Input
                                        id="m_odo"
                                        type="number"
                                        value={newMaintenanceRecord.odometer_reading || ""}
                                        onChange={(e) => setNewMaintenanceRecord({ ...newMaintenanceRecord, odometer_reading: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="m_performed">Performed By</Label>
                                <Input
                                    id="m_performed"
                                    value={newMaintenanceRecord.performed_by}
                                    onChange={(e) => setNewMaintenanceRecord({ ...newMaintenanceRecord, performed_by: e.target.value })}
                                    placeholder="Mechanic or shop name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="m_notes">Notes</Label>
                                <Textarea
                                    id="m_notes"
                                    value={newMaintenanceRecord.notes || ""}
                                    onChange={(e) => setNewMaintenanceRecord({ ...newMaintenanceRecord, notes: e.target.value })}
                                />
                            </div>
                            <Button
                                className="w-full"
                                onClick={() => createMaintenanceMutation.mutate(newMaintenanceRecord)}
                                disabled={!newMaintenanceRecord.description || !newMaintenanceRecord.service_date}
                            >
                                Add Record
                            </Button>
                        </div>

                        {/* History List */}
                        <div>
                            <h3 className="font-semibold text-sm mb-4">History</h3>
                            {!maintenanceRecords || maintenanceRecords.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No maintenance records found.</p>
                            ) : (
                                <div className="space-y-4">
                                    {maintenanceRecords.map((record) => (
                                        <div key={record.id} className="border rounded-lg p-4 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div className="font-medium">{record.description}</div>
                                                <div className="text-sm font-semibold">${record.cost.toFixed(2)}</div>
                                            </div>
                                            <div className="flex gap-4 text-xs text-muted-foreground">
                                                <div>Date: {record.service_date}</div>
                                                <div>Type: {getMaintenanceTypeLabel(record.type)}</div>
                                                {record.odometer_reading && <div>Odo: {record.odometer_reading}</div>}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                By: {record.performed_by}
                                            </div>
                                            {record.notes && (
                                                <div className="text-xs bg-muted p-2 rounded mt-2">
                                                    {record.notes}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </Card>
    );
}
