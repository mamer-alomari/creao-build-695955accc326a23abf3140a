import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCreaoAuth } from "@/sdk/core/auth";
import { QuoteORM, type QuoteModel } from "@/sdk/database/orm/orm_quote";
import { JobORM, type JobModel, JobStatus } from "@/sdk/database/orm/orm_job";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Package, Truck, Calendar, ArrowRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function PortalDashboard() {
    const { user } = useCreaoAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Fetch Quotes
    const { data: quotes = [], isLoading: isLoadingQuotes } = useQuery({
        queryKey: ["customer-quotes", user?.uid],
        enabled: !!user?.uid,
        queryFn: async () => {
            if (!user?.uid) return [];
            return await QuoteORM.getInstance().getQuotesByCustomerId(user.uid);
        }
    });

    // Fetch Jobs
    const { data: jobs = [], isLoading: isLoadingJobs } = useQuery({
        queryKey: ["customer-jobs", user?.uid],
        enabled: !!user?.uid,
        queryFn: async () => {
            if (!user?.uid) return [];
            return await JobORM.getInstance().getJobsByCustomerId(user.uid);
        }
    });

    // Book Quote Mutation
    const bookQuoteMutation = useMutation({
        mutationFn: async (quote: QuoteModel) => {
            // 1. Create Job
            const jobData: JobModel = {
                id: "", // Let ORM generate
                data_creator: user!.uid,
                data_updater: user!.uid,
                create_time: new Date().toISOString(),
                update_time: new Date().toISOString(),
                company_id: quote.company_id || "PENDING_ASSIGNMENT", // If no company, mark for admin assignment
                customer_name: quote.customer_name,
                customer_id: user!.uid,
                status: JobStatus.Quote, // Initial status as Booked/Quote
                scheduled_date: quote.move_date,
                pickup_address: quote.pickup_address,
                dropoff_address: quote.dropoff_address,
                estimated_cost: quote.estimated_price_min, // Use min price for now
                inventory_data: JSON.stringify(quote.inventory_items)
            };

            const [newJob] = await JobORM.getInstance().insertJob([jobData]);

            // 2. Update Quote Status
            await QuoteORM.getInstance().updateStatus(quote.id, "BOOKED");

            return newJob;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer-quotes"] });
            queryClient.invalidateQueries({ queryKey: ["customer-jobs"] });
            alert("Booking Confirmed! A mover will be assigned shortly.");
        },
        onError: (error) => {
            console.error("Booking failed:", error);
            alert("Failed to book. Please try again.");
        }
    });

    if (isLoadingQuotes || isLoadingJobs) {
        return <div className="p-8 text-center text-muted-foreground">Loading your dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">My Move Dashboard</h1>

            <Tabs defaultValue="quotes" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="quotes">My Quotes ({quotes.length})</TabsTrigger>
                    <TabsTrigger value="jobs">Active Jobs ({jobs.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="quotes" className="space-y-4 mt-6">
                    {quotes.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <p className="text-muted-foreground mb-4">You haven't requested any quotes yet.</p>
                                <Button onClick={() => navigate({ to: "/get-quote" })}>
                                    Get a Quote
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        quotes.map((quote) => (
                            <Card key={quote.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Calendar className="h-5 w-5 text-muted-foreground" />
                                                {format(new Date(quote.move_date), "PPP")}
                                            </CardTitle>
                                            <CardDescription>
                                                Created: {format(new Date(quote.create_time), "PP")}
                                            </CardDescription>
                                        </div>
                                        <Badge variant={quote.status === "BOOKED" ? "secondary" : "default"}>
                                            {quote.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                                        <div className="space-y-1">
                                            <div className="text-sm font-medium text-muted-foreground">Pickup</div>
                                            <div>{quote.pickup_address}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-sm font-medium text-muted-foreground">Dropoff</div>
                                            <div>{quote.dropoff_address}</div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center border-t pt-4">
                                        <div className="text-lg font-bold">
                                            ${quote.estimated_price_min} - ${quote.estimated_price_max}
                                        </div>
                                        {quote.status === "PENDING" && (
                                            <Button
                                                onClick={() => bookQuoteMutation.mutate(quote)}
                                                disabled={bookQuoteMutation.isPending}
                                            >
                                                {bookQuoteMutation.isPending ? "Booking..." : "Book Now"}
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        )}
                                        {quote.status === "BOOKED" && (
                                            <div className="flex items-center text-green-600 font-medium">
                                                <CheckCircle2 className="mr-2 h-5 w-5" />
                                                Booked
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="jobs" className="space-y-4 mt-6">
                    {jobs.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                                No active jobs found. Book a quote to get started!
                            </CardContent>
                        </Card>
                    ) : (
                        jobs.map((job) => (
                            <Card key={job.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Truck className="h-5 w-5 text-primary" />
                                                Move on {format(new Date(job.scheduled_date), "PPP")}
                                            </CardTitle>
                                            <CardDescription>Job ID: {job.id.slice(0, 8)}</CardDescription>
                                        </div>
                                        <JobStatusBadge status={job.status} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <div className="text-sm font-medium text-muted-foreground">Locations</div>
                                            <div className="text-sm">
                                                <span className="text-muted-foreground">From:</span> {job.pickup_address} <br />
                                                <span className="text-muted-foreground">To:</span> {job.dropoff_address}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-sm font-medium text-muted-foreground">Status Details</div>
                                            <div className="text-sm">
                                                Your move is currently <strong>{JobStatus[job.status]}</strong>.
                                                {job.company_id === "PENDING_ASSIGNMENT" && (
                                                    <span className="block text-amber-600">Waiting for company assignment.</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function JobStatusBadge({ status }: { status: JobStatus }) {
    const styles = {
        [JobStatus.Unspecified]: "bg-gray-100 text-gray-800",
        [JobStatus.Quote]: "bg-blue-100 text-blue-800",
        [JobStatus.Booked]: "bg-purple-100 text-purple-800",
        [JobStatus.InProgress]: "bg-yellow-100 text-yellow-800",
        [JobStatus.Completed]: "bg-green-100 text-green-800",
        [JobStatus.Canceled]: "bg-red-100 text-red-800",
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles[0]}`}>
            {JobStatus[status]}
        </span>
    );
}
