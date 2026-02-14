
import { useQuery } from "@tanstack/react-query";
import { useCreaoAuth } from "@/sdk/core/auth";
import { JobWorkerAssignmentORM } from "@/sdk/database/orm/orm_job_worker_assignment";
import { JobORM, JobStatus, type JobModel } from "@/sdk/database/orm/orm_job";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MapPin, Navigation, Clock, ChevronRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function WorkerDashboard() {
    const { user } = useCreaoAuth();
    const navigate = useNavigate();

    // 1. Fetch Assignments
    const { data: jobs = [], isLoading } = useQuery({
        queryKey: ["worker-jobs", user?.uid],
        enabled: !!user?.uid,
        queryFn: async () => {
            if (!user?.uid) return [];
            // Get assignments
            const assignments = await JobWorkerAssignmentORM.getInstance().getJobWorkerAssignmentByWorkerId(user.uid);
            const jobIds = assignments.map(a => a.job_id);

            if (jobIds.length === 0) return [];

            // Get Job Details
            return await JobORM.getInstance().getJobByIDs(jobIds);
        }
    });

    const today = new Date();
    const todaysJobs = jobs.filter(job => {
        const jobDate = new Date(job.scheduled_date);
        return jobDate.getDate() === today.getDate() &&
            jobDate.getMonth() === today.getMonth() &&
            jobDate.getFullYear() === today.getFullYear();
    });

    if (isLoading) {
        return <div className="p-8 text-center">Loading schedule...</div>;
    }

    return (
        <div className="space-y-6 pb-20">
            <div>
                <h1 className="text-2xl font-bold">Good Morning!</h1>
                <p className="text-muted-foreground">You have {todaysJobs.length} jobs today.</p>
                <Button
                    variant="destructive"
                    className="mt-4 w-full md:w-auto"
                    onClick={() => navigate({ to: "/worker/report-incident" })}
                >
                    Report Incident
                </Button>
            </div>

            {/* Today's Schedule */}
            <div className="space-y-4">
                {todaysJobs.length === 0 ? (
                    <Card className="bg-slate-50 border-dashed">
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No jobs scheduled for today.
                        </CardContent>
                    </Card>
                ) : (
                    todaysJobs.map(job => (
                        <Card key={job.id} className="overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="bg-white pb-2">
                                <div className="flex justify-between items-start">
                                    <Badge variant="outline" className="mb-2">
                                        {format(new Date(job.scheduled_date), "p")}
                                    </Badge>
                                    <JobStatusBadge status={job.status} />
                                </div>
                                <CardTitle className="text-lg">{job.customer_name}</CardTitle>
                                <CardDescription>Job #{job.id.slice(0, 6)}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                {/* Route Preview */}
                                <div className="space-y-3 relative pl-4 border-l-2 border-slate-100 ml-2">
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-green-500 ring-4 ring-white" />
                                        <div className="text-sm font-medium">Pickup</div>
                                        <div className="text-sm text-muted-foreground truncate">{job.pickup_address}</div>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-red-500 ring-4 ring-white" />
                                        <div className="text-sm font-medium">Dropoff</div>
                                        <div className="text-sm text-muted-foreground truncate">{job.dropoff_address}</div>
                                    </div>
                                </div>

                                <Button className="w-full" size="lg" onClick={() => navigate({ to: `/worker/jobs/${job.id}` })}>
                                    Start Job <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Future Jobs Preview (Optional) */}
            {jobs.length > todaysJobs.length && (
                <div className="pt-4">
                    <h2 className="text-lg font-semibold mb-3">Upcoming</h2>
                    <div className="space-y-3">
                        {jobs.filter(j => !todaysJobs.includes(j)).map(job => (
                            <Card key={job.id} className="bg-slate-50">
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div>
                                        <div className="font-medium">{format(new Date(job.scheduled_date), "PPP")}</div>
                                        <div className="text-sm text-muted-foreground">{job.pickup_address}</div>
                                    </div>
                                    <Badge variant="secondary">{JobStatus[job.status]}</Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function JobStatusBadge({ status }: { status: JobStatus }) {
    const labels = {
        [JobStatus.Unspecified]: "Wait",
        [JobStatus.Quote]: "Quote",
        [JobStatus.Booked]: "Scheduled",
        [JobStatus.InProgress]: "Active",
        [JobStatus.Completed]: "Done",
        [JobStatus.Canceled]: "Canceled",
    };
    return <Badge>{labels[status] || "Unknown"}</Badge>;
}
