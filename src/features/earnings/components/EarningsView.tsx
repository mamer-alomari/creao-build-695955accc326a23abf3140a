import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type JobModel, JobStatus } from "@/sdk/database/orm/orm_job";
import { DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface EarningsViewProps {
    jobs: JobModel[];
}

export function EarningsView({ jobs }: EarningsViewProps) {
    // Filter for completed jobs only
    const completedJobs = jobs.filter(
        (job) => job.status === JobStatus.Completed
    );

    // Calculate total earnings
    // Prefer full_price, fallback to estimated_cost if full_price is missing
    const totalEarnings = completedJobs.reduce((sum, job) => {
        return sum + (job.full_price || job.estimated_cost || 0);
    }, 0);

    // Calculate average per job
    const averageEarnings = completedJobs.length > 0
        ? totalEarnings / completedJobs.length
        : 0;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Across {completedJobs.length} completed jobs
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average per Job</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${averageEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Completed Jobs</CardTitle>
                    <CardDescription>
                        Financial breakdown of all completed jobs.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Route</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {completedJobs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        No completed jobs found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                completedJobs.map((job) => (
                                    <TableRow key={job.id}>
                                        <TableCell className="font-medium">{job.customer_name}</TableCell>
                                        <TableCell>
                                            {(() => {
                                                const dateStr = job.scheduled_date;
                                                const asNum = parseInt(dateStr);
                                                if (!isNaN(asNum) && asNum > 315360000 && /^\d+$/.test(dateStr)) {
                                                    return new Date(asNum * 1000).toLocaleDateString();
                                                }
                                                return new Date(dateStr).toLocaleDateString();
                                            })()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-[300px] truncate" title={`${job.pickup_address} → ${job.dropoff_address}`}>
                                                {job.pickup_address} → {job.dropoff_address}
                                            </div>
                                        </TableCell>
                                        <TableCell className={cn("text-right font-medium", !job.full_price && "text-muted-foreground italic")}>
                                            ${(job.full_price || job.estimated_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            {!job.full_price && job.estimated_cost && "*"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    {completedJobs.some(j => !j.full_price && j.estimated_cost) && (
                        <p className="text-xs text-muted-foreground mt-4 text-right">
                            * Showing estimated cost where full price is not set.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
