
import { useQuery } from "@tanstack/react-query";
import { useCreaoAuth } from "@/sdk/core/auth";
import { JobORM, JobStatus } from "@/sdk/database/orm/orm_job";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import { HardHat, Truck, Map, Plus } from "lucide-react"; // HardHat for Foreman

export function ForemanDashboard() {
    const { companyId } = useCreaoAuth();
    const navigate = useNavigate();

    // Fetch Active Jobs
    const { data: jobs = [], isLoading } = useQuery({
        queryKey: ["foreman-jobs", companyId],
        enabled: !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            // Foreman sees all active jobs for the company
            return await JobORM.getInstance().getJobsByCompanyId(companyId);
        }
    });

    const activeJobs = jobs.filter(j => j.status !== JobStatus.Completed && j.status !== JobStatus.Canceled);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Field Operations</h1>
                    <p className="text-muted-foreground">Foreman Dashboard</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => navigate({ to: "/get-quote" })}>
                        <Plus className="mr-2 h-4 w-4" /> New Field Quote
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="jobs">
                <TabsList>
                    <TabsTrigger value="jobs">Active Jobs ({activeJobs.length})</TabsTrigger>
                    <TabsTrigger value="workers">Crew Availability</TabsTrigger>
                    <TabsTrigger value="vehicles">Fleet Status</TabsTrigger>
                </TabsList>

                <TabsContent value="jobs" className="space-y-4 mt-4">
                    {activeJobs.map(job => (
                        <Card key={job.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xl font-bold">{job.customer_name}</CardTitle>
                                <Badge>{JobStatus[job.status]}</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-4 mt-2">
                                    <div>
                                        <div className="text-sm font-medium text-muted-foreground">Pickup</div>
                                        <div>{job.pickup_address}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-muted-foreground">Scheduled</div>
                                        <div>{new Date(job.scheduled_date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => navigate({ to: `/foreman/jobs/${job.id}` })}>
                                        Manage Resources
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        View Estimate
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>

                <TabsContent value="workers">
                    <Card><CardContent className="p-8 text-center text-muted-foreground">Worker Schedule View Coming Soon</CardContent></Card>
                </TabsContent>
                <TabsContent value="vehicles">
                    <Card><CardContent className="p-8 text-center text-muted-foreground">Vehicle Status View Coming Soon</CardContent></Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
