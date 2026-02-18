import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EquipmentORM, type EquipmentModel, EquipmentType } from "@/sdk/database/orm/orm_equipment";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, Trash2, Repeat, Box, ChevronDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function EquipmentView({ equipment, companyId }: { equipment: EquipmentModel[]; companyId: string }) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newEquipment, setNewEquipment] = useState<Partial<EquipmentModel>>({
        name: "",
        total_quantity: 0,
        type: EquipmentType.Reusable,
    });

    const queryClient = useQueryClient();

    const createEquipmentMutation = useMutation({
        mutationFn: async (equip: Partial<EquipmentModel>) => {
            const equipmentOrm = EquipmentORM.getInstance();
            return await equipmentOrm.insertEquipment([{
                ...equip,
                company_id: companyId,
                type: equip.type || EquipmentType.Reusable,
            } as EquipmentModel]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipment"] });
            setIsCreateDialogOpen(false);
            setNewEquipment({
                name: "",
                total_quantity: 0,
                type: EquipmentType.Reusable,
            });
        },
    });

    const updateEquipmentMutation = useMutation({
        mutationFn: async (equip: EquipmentModel) => {
            const equipmentOrm = EquipmentORM.getInstance();
            return await equipmentOrm.setEquipmentById(equip.id, equip);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipment"] });
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="type">Type</Label>
                                        <Select
                                            value={newEquipment.type?.toString()}
                                            onValueChange={(val) => setNewEquipment({ ...newEquipment, type: parseInt(val) })}
                                        >
                                            <SelectTrigger id="type">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={EquipmentType.Reusable.toString()}>Reusable</SelectItem>
                                                <SelectItem value={EquipmentType.Consumable.toString()}>Consumable</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Total Quantity</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {equipment.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 p-0 hover:bg-transparent -ml-2 px-2">
                                                    {item.type === EquipmentType.Consumable ? (
                                                        <Badge variant="secondary" className="gap-1 pointer-events-none">
                                                            <Box className="h-3 w-3" /> Consumable
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="gap-1 pointer-events-none">
                                                            <Repeat className="h-3 w-3" /> Reusable
                                                        </Badge>
                                                    )}
                                                    <ChevronDown className="ml-1 h-3 w-3 opacity-30" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start">
                                                <DropdownMenuItem onClick={() => updateEquipmentMutation.mutate({ ...item, type: EquipmentType.Reusable })}>
                                                    <Repeat className="h-4 w-4 mr-2" /> Reusable
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateEquipmentMutation.mutate({ ...item, type: EquipmentType.Consumable })}>
                                                    <Box className="h-4 w-4 mr-2" /> Consumable
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-fit p-0 font-normal hover:bg-transparent underline decoration-dashed underline-offset-4 decoration-muted-foreground/30">
                                                    {item.total_quantity}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-40 p-2">
                                                <div className="flex gap-2 items-center">
                                                    <Label htmlFor={`qty-${item.id}`} className="sr-only">Quantity</Label>
                                                    <Input
                                                        id={`qty-${item.id}`}
                                                        type="number"
                                                        defaultValue={item.total_quantity}
                                                        className="h-8"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                updateEquipmentMutation.mutate({ ...item, total_quantity: parseInt(e.currentTarget.value) || 0 });
                                                                // Ideally close popover here, but difficult without dedicated state per item.
                                                                // User can click away.
                                                            }
                                                        }}
                                                        onBlur={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            if (!isNaN(val) && val !== item.total_quantity) {
                                                                updateEquipmentMutation.mutate({ ...item, total_quantity: val });
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </TableCell>
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
