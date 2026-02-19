import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Users, DollarSign, Briefcase, Clock } from "lucide-react";
import { type JobModel, JobStatus } from "@/sdk/database/orm/orm_job";
import { type WorkerModel } from "@/sdk/database/orm/orm_worker";
import { type JobWorkerAssignmentModel } from "@/sdk/database/orm/orm_job_worker_assignment";
import { type PayrollRecordModel } from "@/sdk/database/orm/orm_payroll_record";

interface AnalyticsDashboardProps {
    jobs: JobModel[];
    workers: WorkerModel[];
    jobAssignments: JobWorkerAssignmentModel[];
    payrollRecords: PayrollRecordModel[];
}

function fmt(n: number) {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AnalyticsDashboard({
    jobs,
    workers,
    jobAssignments,
    payrollRecords,
}: AnalyticsDashboardProps) {
    const stats = useMemo(() => {
        const completedJobs = jobs.filter((j) => j.status === JobStatus.Completed);
        const revenue = completedJobs.reduce(
            (sum, j) => sum + (j.full_price ?? j.estimated_cost ?? 0),
            0
        );
        const totalPayroll = payrollRecords.reduce((sum, r) => sum + r.total_pay, 0);
        const profit = revenue - totalPayroll;
        const avgJobRevenue = completedJobs.length > 0 ? revenue / completedJobs.length : 0;

        // Jobs by status
        const byStatus: Record<string, number> = {};
        for (const job of jobs) {
            const label = JobStatus[job.status] ?? "Unknown";
            byStatus[label] = (byStatus[label] ?? 0) + 1;
        }

        // Worker utilization: assignments per worker
        const assignmentsPerWorker = new Map<string, number>();
        for (const a of jobAssignments) {
            assignmentsPerWorker.set(a.worker_id, (assignmentsPerWorker.get(a.worker_id) ?? 0) + 1);
        }
        const busyWorkers = [...assignmentsPerWorker.values()].filter((c) => c > 0).length;

        return {
            totalJobs: jobs.length,
            completedJobs: completedJobs.length,
            revenue,
            totalPayroll,
            profit,
            avgJobRevenue,
            byStatus,
            busyWorkers,
            totalWorkers: workers.length,
        };
    }, [jobs, workers, jobAssignments, payrollRecords]);

    const kpis = [
        {
            title: "Total Revenue",
            value: fmt(stats.revenue),
            icon: DollarSign,
            sub: `${stats.completedJobs} completed jobs`,
        },
        {
            title: "Net Profit",
            value: fmt(stats.profit),
            icon: TrendingUp,
            sub: `After ${fmt(stats.totalPayroll)} payroll`,
        },
        {
            title: "Avg Revenue / Job",
            value: fmt(stats.avgJobRevenue),
            icon: Briefcase,
            sub: "Completed jobs only",
        },
        {
            title: "Worker Utilization",
            value: `${stats.busyWorkers} / ${stats.totalWorkers}`,
            icon: Users,
            sub: "Workers with assignments",
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
                <p className="text-muted-foreground">Business performance overview</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi) => {
                    const Icon = kpi.icon;
                    return (
                        <Card key={kpi.title}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    {kpi.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{kpi.value}</p>
                                <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Jobs by Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="h-4 w-4" />
                        Jobs by Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {Object.keys(stats.byStatus).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No job data available.</p>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(stats.byStatus)
                                .sort((a, b) => b[1] - a[1])
                                .map(([label, count]) => {
                                    const pct = stats.totalJobs > 0 ? (count / stats.totalJobs) * 100 : 0;
                                    return (
                                        <div key={label} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span>{label}</span>
                                                <Badge variant="secondary">{count}</Badge>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Payroll Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4" />
                        Payroll Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {payrollRecords.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No payroll records available.</p>
                    ) : (
                        <div className="space-y-2">
                            {payrollRecords.slice(0, 5).map((r) => {
                                const worker = workers.find((w) => w.id === r.worker_id);
                                return (
                                    <div key={r.id} className="flex justify-between text-sm">
                                        <span>{worker?.full_name ?? r.worker_id}</span>
                                        <span className="font-medium">{fmt(r.total_pay)}</span>
                                    </div>
                                );
                            })}
                            {payrollRecords.length > 5 && (
                                <p className="text-xs text-muted-foreground">
                                    +{payrollRecords.length - 5} more records
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
