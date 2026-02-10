import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EquipmentORM, type EquipmentModel } from "@/sdk/database/orm/orm_equipment";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Package, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function EquipmentView({ equipment, companyId }: { equipment: EquipmentModel[]; companyId: string }) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newEquipment, setNewEquipment] = useState<Partial<EquipmentModel>>({
        name: "",
        total_quantity: 0,
    });

    const queryClient = useQueryClient();

    const createEquipmentMutation = useMutation({
        mutationFn: async (equip: Partial<EquipmentModel>) => {
            const equipmentOrm = EquipmentORM.getInstance();
            return await equipmentOrm.insertEquipment([{
                ...equip,
                company_id: companyId,
            } as EquipmentModel]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipment"] });
            setIsCreateDialogOpen(false);
            setNewEquipment({
                name: "",
                total_quantity: 0,
            });
        },
    });

    const deleteEquipmentMutation = useMutation({
        mutationFn: async (equipmentId: string) => {
            const equipmentOrm = EquipmentORM.getInstance();
            await equipmentOrm.deleteEquipmentByIDs([equipmentId]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipment"] });
        },
    });

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Equipment Management</CardTitle>
                        <CardDescription>Manage moving equipment and supplies</CardDescription>
                    </div>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                New Equipment
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Equipment</DialogTitle>
                                <DialogDescription>Add new equipment to your inventory</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Equipment Name</Label>
                                    <Input
                                        id="name"
                                        value={newEquipment.name}
                                        onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                                        placeholder="Dolly, Blankets, Straps, etc."
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="total_quantity">Total Quantity</Label>
                                    <Input
                                        id="total_quantity"
                                        type="number"
                                        value={newEquipment.total_quantity || ""}
                                        onChange={(e) => setNewEquipment({ ...newEquipment, total_quantity: parseInt(e.target.value) || 0 })}
                                        placeholder="10"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                                <Button onClick={() => createEquipmentMutation.mutate(newEquipment)}>Create Equipment</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {equipment.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No equipment yet. Add your first equipment item to get started.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">Total Quantity</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {equipment.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-right">{item.total_quantity}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteEquipmentMutation.mutate(item.id)}
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
        </Card>
    );
}
