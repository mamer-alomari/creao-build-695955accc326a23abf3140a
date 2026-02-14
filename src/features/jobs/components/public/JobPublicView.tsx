
import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { JobORM, type JobModel } from "@/sdk/database/orm/orm_job";
import { CompanyORM, type CompanyModel } from "@/sdk/database/orm/orm_company";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Truck, Package } from "lucide-react";
import { RoomInventoryManager } from "@/components/room-inventory";

export function JobPublicView() {
    const { jobId } = useParams({ from: "/jobs/$jobId" });
    const [job, setJob] = useState<JobModel | null>(null);
    const [company, setCompany] = useState<CompanyModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const jobOrm = JobORM.getInstance();
                const jobs = await jobOrm.getJobById(jobId);
                if (jobs.length === 0) {
                    setError("Job not found");
                } else {
                    setJob(jobs[0]);
                    // Fetch company info
                    if (jobs[0].company_id) {
                        const companyOrm = CompanyORM.getInstance();
                        const companies = await companyOrm.getCompanyById(jobs[0].company_id);
                        if (companies.length > 0) {
                            setCompany(companies[0]);
                        }
                    }
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load job details");
            } finally {
                setLoading(false);
            }
        };

        if (jobId) {
            fetchJob();
        }
    }, [jobId]);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading job details...</div>;
    }

    if (error || !job) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
                <h1 className="text-2xl font-bold text-destructive mb-2">Error</h1>
                <p className="text-muted-foreground">{error || "Job not found"}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Company Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold">{company?.name || "Moving Company"}</h1>
                    <p className="text-sm text-muted-foreground">Job Details & Inventory</p>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{job.customer_name}</CardTitle>
                                <CardDescription>Move scheduled for {new Date(job.scheduled_date).toLocaleDateString()}</CardDescription>
                            </div>
                            <Badge variant={job.status === 1 ? "secondary" : "default"}>
                                {job.status === 1 ? "Quote" : "Booked"}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Locations */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <LabelIcon icon={MapPin} label="Pickup Location" />
                                <p className="font-medium">{job.pickup_address}</p>
                            </div>
                            <div className="space-y-2">
                                <LabelIcon icon={MapPin} label="Dropoff Location" />
                                <p className="font-medium">{job.dropoff_address}</p>
                            </div>
                        </div>

                        <Separator />

                        {/* Details */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-1">
                                <LabelIcon icon={Calendar} label="Date" />
                                <p className="font-medium">{new Date(job.scheduled_date).toLocaleDateString()}</p>
                            </div>
                            <div className="space-y-1">
                                <LabelIcon icon={Truck} label="Distance" />
                                <p className="font-medium">{job.estimated_cost ? "Calculated" : "Pending"}</p>
                            </div>
                            <div className="space-y-1">
                                <LabelIcon icon={Package} label="Items" />
                                <p className="font-medium">
                                    {job.inventory_data ? JSON.parse(job.inventory_data).reduce((acc: number, r: any) => acc + r.totalItems, 0) : 0} items
                                </p>
                            </div>
                        </div>

                        <Separator />

                        {/* Inventory */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Inventory</h3>
                            {job.inventory_data ? (
                                <RoomInventoryManager
                                    initialRooms={JSON.parse(job.inventory_data)}
                                    readOnly={true}
                                    onInventoryChange={() => { }}
                                />
                            ) : (
                                <p className="text-muted-foreground text-sm">No inventory data available.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function LabelIcon({ icon: Icon, label }: { icon: any, label: string }) {
    return (
        <div className="flex items-center text-muted-foreground text-sm">
            <Icon className="w-4 h-4 mr-1" />
            <span>{label}</span>
        </div>
    );
}
