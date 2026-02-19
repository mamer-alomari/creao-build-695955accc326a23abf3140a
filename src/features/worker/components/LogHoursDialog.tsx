import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { PayrollRecordORM, PayrollRecordStatus, type PayrollRecordModel } from "@/sdk/database/orm/orm_payroll_record";
import { useCreaoAuth } from "@/sdk/core/auth";
import { Clock } from "lucide-react";

interface LogHoursDialogProps {
    trigger?: React.ReactNode;
}

export function LogHoursDialog({ trigger }: LogHoursDialogProps) {
    const { user, companyId } = useCreaoAuth();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    // Default to today
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");

    const [newRecord, setNewRecord] = useState<Partial<PayrollRecordModel>>({
        pay_period_start: todayStr,
        pay_period_end: todayStr,
        hours_worked: 0,
        hourly_wage: 0,
    });



    const createPayrollMutation = useMutation({
        mutationFn: async () => {
            if (!user?.uid || !companyId) throw new Error("Missing user or company information");

            const payrollOrm = PayrollRecordORM.getInstance();
            // Manager determines rate/pay later
            const totalPay = 0;

            return await payrollOrm.insertPayrollRecord([{
                ...newRecord,
                hourly_wage: 0,
                worker_id: user.uid,
                company_id: companyId,
                total_pay: totalPay,
                status: PayrollRecordStatus.Draft, // Default to draft for approval
            } as PayrollRecordModel]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payrollRecords"] });
            setIsOpen(false);
            setNewRecord({
                pay_period_start: todayStr,
                pay_period_end: todayStr,
                hours_worked: 0,
                hourly_wage: 0,
            });
            toast.success("Hours logged successfully.");
        },
        onError: (error) => {
            console.error("Failed to log hours:", error);
            toast.error("Failed to log hours. Please try again.");
        }
    });

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline">
                        <Clock className="mr-2 h-4 w-4" />
                        Log Hours
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Hours</DialogTitle>
                    <DialogDescription>
                        Submit your hours for the current pay period.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={newRecord.pay_period_start}
                                onChange={(e) => setNewRecord({
                                    ...newRecord,
                                    pay_period_start: e.target.value,
                                    pay_period_end: e.target.value
                                })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="hours">Hours Worked</Label>
                            <Input
                                id="hours"
                                type="number"
                                step="0.5"
                                value={newRecord.hours_worked || ""}
                                onChange={(e) => setNewRecord({ ...newRecord, hours_worked: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rate">Hourly Rate ($)</Label>
                            <Input
                                id="rate"
                                type="number"
                                value={newRecord.hourly_wage || ""}
                                onChange={(e) => setNewRecord({ ...newRecord, hourly_wage: parseFloat(e.target.value) || 0 })}
                                disabled
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button
                        onClick={() => createPayrollMutation.mutate()}
                        disabled={!newRecord.hours_worked || createPayrollMutation.isPending}
                    >
                        {createPayrollMutation.isPending ? "Submitting..." : "Submit Hours"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
