import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkerORM, type WorkerModel, WorkerRole, WorkerStatus } from "@/sdk/database/orm/orm_worker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { sendWorkerInvitation } from "@/features/workers/utils/invitation";

import { useCreaoAuth, UserRole } from "@/sdk/core/auth";

export function WorkersView({ workers, companyId }: { workers: WorkerModel[]; companyId: string }) {
    const { role } = useCreaoAuth();
    const canCreateWorker = role === UserRole.Manager || role === UserRole.Admin;

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newWorker, setNewWorker] = useState<Partial<WorkerModel>>({
        full_name: "",
        email: "",
        phone_number: "",
        role: WorkerRole.Mover,
        status: WorkerStatus.Active,
    });

    const queryClient = useQueryClient();

    const createWorkerMutation = useMutation({
        mutationFn: async (worker: Partial<WorkerModel>) => {
            const workerOrm = WorkerORM.getInstance();
            return await workerOrm.insertWorker([{
                ...worker,
                company_id: companyId,
            } as WorkerModel]);
        },
        onSuccess: async (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["workers"] });
            setIsCreateDialogOpen(false);

            // Send invitation to the newly created worker(s)
            // The mutation returns an array of created workers
            if (data && data.length > 0) {
                try {
                    await sendWorkerInvitation(data[0]);
                } catch (error) {
                    console.error("Failed to send invitation:", error);
                    // Don't block UI on invitation failure, but maybe toast error?
                }
            }

            setNewWorker({
                full_name: "",
                email: "",
                phone_number: "",
                role: WorkerRole.Mover,
                status: WorkerStatus.Active,
            });
        },
        onError: (error) => {
            console.error("Failed to create worker:", error);
            alert(`Failed to create worker: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    });

    const deleteWorkerMutation = useMutation({
        mutationFn: async (workerId: string) => {
            const workerOrm = WorkerORM.getInstance();
            await workerOrm.deleteWorkerByIDs([workerId]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["workers"] });
        },
        onError: (error) => {
            console.error("Failed to delete worker:", error);
            alert(`Failed to delete worker: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    });

    const getWorkerRoleLabel = (role: WorkerRole) => {
        const labels: Record<WorkerRole, string> = {
            [WorkerRole.Unspecified]: "Unspecified",
            [WorkerRole.Mover]: "Mover",
            [WorkerRole.Driver]: "Driver",
            [WorkerRole.Supervisor]: "Supervisor",
        };
        return labels[role];
    };

    const getWorkerStatusBadge = (status: WorkerStatus) => {
        const variants: Record<WorkerStatus, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
            [WorkerStatus.Unspecified]: { variant: "outline", label: "Unspecified" },
            [WorkerStatus.Active]: { variant: "default", label: "Active" },
            [WorkerStatus.Inactive]: { variant: "secondary", label: "Inactive" },
        };
        const config = variants[status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Workers Management</CardTitle>
                        <CardDescription>Manage your moving company workers</CardDescription>
                    </div>
                    {canCreateWorker && (
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Worker
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New Worker</DialogTitle>
                                    <DialogDescription>Add a new worker to your team</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="full_name">Full Name</Label>
                                        <Input
                                            id="full_name"
                                            value={newWorker.full_name}
                                            onChange={(e) => setNewWorker({ ...newWorker, full_name: e.target.value })}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={newWorker.email || ""}
                                            onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            value={newWorker.phone_number || ""}
                                            onChange={(e) => setNewWorker({ ...newWorker, phone_number: e.target.value })}
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                                        <Input
                                            id="hourly_rate"
                                            type="number"
                                            value={newWorker.hourly_rate || ""}
                                            onChange={(e) => setNewWorker({ ...newWorker, hourly_rate: parseFloat(e.target.value) })}
                                            placeholder="20.00"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="role">Role</Label>
                                        <Select
                                            value={newWorker.role?.toString()}
                                            onValueChange={(value) => setNewWorker({ ...newWorker, role: parseInt(value) as WorkerRole })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={WorkerRole.Mover.toString()}>Mover</SelectItem>
                                                <SelectItem value={WorkerRole.Driver.toString()}>Driver</SelectItem>
                                                <SelectItem value={WorkerRole.Supervisor.toString()}>Supervisor</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="status">Status</Label>
                                        <Select
                                            value={newWorker.status?.toString()}
                                            onValueChange={(value) => setNewWorker({ ...newWorker, status: parseInt(value) as WorkerStatus })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={WorkerStatus.Active.toString()}>Active</SelectItem>
                                                <SelectItem value={WorkerStatus.Inactive.toString()}>Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="can_self_schedule"
                                            checked={newWorker.can_self_schedule || false}
                                            onCheckedChange={(checked) => setNewWorker({ ...newWorker, can_self_schedule: checked as boolean })}
                                        />
                                        <Label htmlFor="can_self_schedule">Allow Self-Scheduling</Label>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={() => createWorkerMutation.mutate(newWorker)}>Create Worker</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {workers.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No workers yet. Add your first worker to get started.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workers.map((worker) => (
                                <TableRow key={worker.id}>
                                    <TableCell className="font-medium">{worker.full_name}</TableCell>
                                    <TableCell>{getWorkerRoleLabel(worker.role)}</TableCell>
                                    <TableCell>{getWorkerStatusBadge(worker.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteWorkerMutation.mutate(worker.id)}
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
