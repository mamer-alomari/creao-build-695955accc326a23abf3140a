import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PayrollRecordORM, type PayrollRecordModel, PayrollRecordStatus } from "@/sdk/database/orm/orm_payroll_record";
import { type WorkerModel } from "@/sdk/database/orm/orm_worker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function PayrollView({ payrollRecords, workers, companyId }: {
    payrollRecords: PayrollRecordModel[];
    workers: WorkerModel[];
    companyId: string
}) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newPayroll, setNewPayroll] = useState<Partial<PayrollRecordModel>>({
        worker_id: "",
        pay_period_start: "",
        pay_period_end: "",
        hourly_wage: 0,
        hours_worked: 0,
        total_pay: 0,
        status: PayrollRecordStatus.Draft,
    });

    const queryClient = useQueryClient();

    const createPayrollMutation = useMutation({
        mutationFn: async (payroll: Partial<PayrollRecordModel>) => {
            const payrollOrm = PayrollRecordORM.getInstance();
            const startTimestamp = payroll.pay_period_start ? Math.floor(new Date(payroll.pay_period_start).getTime() / 1000).toString() : "";
            const endTimestamp = payroll.pay_period_end ? Math.floor(new Date(payroll.pay_period_end).getTime() / 1000).toString() : "";
            return await payrollOrm.insertPayrollRecord([{
                ...payroll,
                company_id: companyId,
                pay_period_start: startTimestamp,
                pay_period_end: endTimestamp,
                total_pay: (payroll.hourly_wage || 0) * (payroll.hours_worked || 0),
            } as PayrollRecordModel]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payrollRecords"] });
            setIsCreateDialogOpen(false);
            setNewPayroll({
                worker_id: "",
                pay_period_start: "",
                pay_period_end: "",
                hourly_wage: 0,
                hours_worked: 0,
                total_pay: 0,
                status: PayrollRecordStatus.Draft,
            });
        },
    });

    const updatePayrollStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: PayrollRecordStatus }) => {
            const payrollOrm = PayrollRecordORM.getInstance();
            const existing = await payrollOrm.getPayrollRecordByIDs([id]);
            if (existing.length > 0) {
                const updated = { ...existing[0], status };
                await payrollOrm.setPayrollRecordById(id, updated);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payrollRecords"] });
        },
    });

    const deletePayrollMutation = useMutation({
        mutationFn: async (payrollId: string) => {
            const payrollOrm = PayrollRecordORM.getInstance();
            await payrollOrm.deletePayrollRecordByIDs([payrollId]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payrollRecords"] });
        },
    });

    const handleCreatePayroll = () => {
        createPayrollMutation.mutate(newPayroll);
    };

    const getPayrollStatusBadge = (status: PayrollRecordStatus) => {
        const variants: Record<PayrollRecordStatus, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
            [PayrollRecordStatus.Unspecified]: { variant: "outline", label: "Unspecified" },
            [PayrollRecordStatus.Draft]: { variant: "secondary", label: "Draft" },
            [PayrollRecordStatus.Approved]: { variant: "default", label: "Approved" },
            [PayrollRecordStatus.Paid]: { variant: "outline", label: "Paid" },
        };
        const config = variants[status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getWorkerName = (workerId: string) => {
        const worker = workers.find(w => w.id === workerId);
        return worker?.full_name || "Unknown Worker";
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Payroll Management</CardTitle>
                        <CardDescription>Manage worker wages and payroll records</CardDescription>
                    </div>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                New Payroll Record
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Payroll Record</DialogTitle>
                                <DialogDescription>Enter payroll details for a worker</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="worker_id">Worker</Label>
                                    <Select
                                        value={newPayroll.worker_id}
                                        onValueChange={(value) => setNewPayroll({ ...newPayroll, worker_id: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select worker" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {workers.map((worker) => (
                                                <SelectItem key={worker.id} value={worker.id}>
                                                    {worker.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="pay_period_start">Pay Period Start</Label>
                                        <Input
                                            id="pay_period_start"
                                            type="date"
                                            value={newPayroll.pay_period_start}
                                            onChange={(e) => setNewPayroll({ ...newPayroll, pay_period_start: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="pay_period_end">Pay Period End</Label>
                                        <Input
                                            id="pay_period_end"
                                            type="date"
                                            value={newPayroll.pay_period_end}
                                            onChange={(e) => setNewPayroll({ ...newPayroll, pay_period_end: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="hourly_wage">Hourly Wage ($)</Label>
                                        <Input
                                            id="hourly_wage"
                                            type="number"
                                            value={newPayroll.hourly_wage || ""}
                                            onChange={(e) => setNewPayroll({ ...newPayroll, hourly_wage: parseFloat(e.target.value) || 0 })}
                                            placeholder="25.00"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="hours_worked">Hours Worked</Label>
                                        <Input
                                            id="hours_worked"
                                            type="number"
                                            value={newPayroll.hours_worked || ""}
                                            onChange={(e) => setNewPayroll({ ...newPayroll, hours_worked: parseFloat(e.target.value) || 0 })}
                                            placeholder="40"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Total Pay</Label>
                                    <div className="text-2xl font-bold">
                                        ${((newPayroll.hourly_wage || 0) * (newPayroll.hours_worked || 0)).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreatePayroll}>Create Payroll Record</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {payrollRecords.length === 0 ? (
                    <div className="text-center py-12">
                        <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No payroll records yet. Create your first payroll record to get started.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Worker</TableHead>
                                <TableHead>Pay Period</TableHead>
                                <TableHead>Hourly Wage</TableHead>
                                <TableHead>Hours Worked</TableHead>
                                <TableHead>Total Pay</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payrollRecords.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell className="font-medium">{getWorkerName(record.worker_id)}</TableCell>
                                    <TableCell>
                                        {new Date(parseInt(record.pay_period_start) * 1000).toLocaleDateString()} - {new Date(parseInt(record.pay_period_end) * 1000).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>${record.hourly_wage.toFixed(2)}</TableCell>
                                    <TableCell>{record.hours_worked}</TableCell>
                                    <TableCell className="font-medium">${record.total_pay.toFixed(2)}</TableCell>
                                    <TableCell>{getPayrollStatusBadge(record.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            {(record.status === PayrollRecordStatus.Draft || record.status === PayrollRecordStatus.Unspecified) && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => updatePayrollStatusMutation.mutate({ id: record.id, status: PayrollRecordStatus.Approved })}
                                                >
                                                    Approve
                                                </Button>
                                            )}
                                            {record.status === PayrollRecordStatus.Approved && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => updatePayrollStatusMutation.mutate({ id: record.id, status: PayrollRecordStatus.Paid })}
                                                >
                                                    Mark Paid
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deletePayrollMutation.mutate(record.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
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
