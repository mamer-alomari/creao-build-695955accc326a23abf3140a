import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCreaoAuth } from "@/sdk/core/auth";
import { QuoteORM, type QuoteModel } from "@/sdk/database/orm/orm_quote";
import { JobORM, type JobModel, JobStatus, type JobStop } from "@/sdk/database/orm/orm_job";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, differenceInDays, differenceInHours, isPast } from "date-fns";
import { Package, Truck, Calendar, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle, CreditCard, Clock, MapPin, Sparkles } from "lucide-react";
import { StripeCheckoutModal } from "@/components/StripeCheckoutModal";
import { useNavigate } from "@tanstack/react-router";
import { JobTimeline } from "./JobTimeline";
import { useState as useReactState } from "react";
import { generateStopId } from "@/lib/job-stops";

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
            if (quote.customer_id && quote.customer_id !== user!.uid) {
                throw new Error('Unauthorized: You can only book your own quotes');
            }

            if (!quote.customer_name || quote.customer_name.trim().length === 0) {
                throw new Error('Customer name is required');
            }

            if (!Array.isArray(quote.inventory_items)) {
                throw new Error('Invalid inventory data');
            }

            // Check expiration
            if (quote.expires_at && isPast(new Date(quote.expires_at))) {
                throw new Error('This quote has expired. Please request a new quote.');
            }

            // Create Job with stops if available
            const jobData: JobModel = {
                id: "",
                data_creator: user!.uid,
                data_updater: user!.uid,
                create_time: new Date().toISOString(),
                update_time: new Date().toISOString(),
                company_id: quote.company_id || "PENDING_ASSIGNMENT",
                customer_name: quote.customer_name.trim(),
                customer_id: user!.uid,
                status: JobStatus.Quote,
                scheduled_date: quote.move_date,
                pickup_address: quote.pickup_address,
                dropoff_address: quote.dropoff_address,
                estimated_cost: quote.estimated_price_min,
                inventory_data: JSON.stringify(quote.inventory_items),
            };

            // Copy multi-stop data if available
            if (quote.stops && quote.stops.length > 0) {
                jobData.stops = quote.stops.map((s, i) => ({
                    id: generateStopId(),
                    address: s.address,
                    type: s.type,
                    sequence: i,
                    status: "pending" as const,
                }));
                jobData.current_stop_index = 0;
            }

            const [newJob] = await JobORM.getInstance().insertJob([jobData]);
            await QuoteORM.getInstance().updateStatus(quote.id, "BOOKED");

            return newJob;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer-quotes"] });
            queryClient.invalidateQueries({ queryKey: ["customer-jobs"] });
            toast.success("Booking Confirmed! A mover will be assigned shortly.");
        },
        onError: (error) => {
            console.error("Booking failed:", error);
            toast.error(error instanceof Error ? error.message : "Failed to book. Please try again.");
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
                            <QuoteCard
                                key={quote.id}
                                quote={quote}
                                onBook={() => bookQuoteMutation.mutate(quote)}
                                isBooking={bookQuoteMutation.isPending}
                            />
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
                            <JobCard key={job.id} job={job} />
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function QuoteCard({ quote, onBook, isBooking }: { quote: QuoteModel; onBook: () => void; isBooking: boolean }) {
    const isExpired = quote.expires_at ? isPast(new Date(quote.expires_at)) : false;

    const expirationLabel = (() => {
        if (!quote.expires_at) return null;
        const expiresDate = new Date(quote.expires_at);
        if (isExpired) return "Expired";
        const daysLeft = differenceInDays(expiresDate, new Date());
        if (daysLeft > 1) return `Expires in ${daysLeft} days`;
        const hoursLeft = differenceInHours(expiresDate, new Date());
        if (hoursLeft > 0) return `Expires in ${hoursLeft}h`;
        return "Expires soon";
    })();

    return (
        <Card className={isExpired ? "opacity-70" : ""}>
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
                    <div className="flex items-center gap-2">
                        {expirationLabel && (
                            <Badge variant={isExpired ? "destructive" : "outline"} className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {expirationLabel}
                            </Badge>
                        )}
                        <Badge variant={quote.status === "BOOKED" ? "secondary" : "default"}>
                            {quote.status}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Show stops if multi-stop, otherwise legacy */}
                {quote.stops && quote.stops.length > 0 ? (
                    <div className="space-y-2 mb-4">
                        {quote.stops.map((stop, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <Badge variant="outline" className="text-xs capitalize w-16 justify-center">
                                    {stop.type}
                                </Badge>
                                <span>{stop.address}</span>
                            </div>
                        ))}
                    </div>
                ) : (
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
                )}

                {/* Quote breakdown if available */}
                {quote.quote_breakdown && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 space-y-2">
                        <div className="flex items-center gap-1 text-xs font-semibold text-blue-800">
                            <Sparkles className="h-3 w-3" /> AI Quote Breakdown
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                            <span className="text-muted-foreground">Labor ({quote.quote_breakdown.details.estimatedHours}h)</span>
                            <span className="text-right font-medium">${quote.quote_breakdown.laborCost}</span>
                            <span className="text-muted-foreground">Fuel ({quote.quote_breakdown.details.distanceMiles}mi)</span>
                            <span className="text-right font-medium">${quote.quote_breakdown.fuelCost}</span>
                            <span className="text-muted-foreground">Materials</span>
                            <span className="text-right font-medium">${quote.quote_breakdown.materialsCost}</span>
                            <span className="text-muted-foreground">Insurance</span>
                            <span className="text-right font-medium">${quote.quote_breakdown.insuranceCost}</span>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center border-t pt-4">
                    <div className="text-lg font-bold">
                        ${quote.estimated_price_min} - ${quote.estimated_price_max}
                    </div>
                    {quote.status === "PENDING" && !isExpired && (
                        <Button
                            onClick={onBook}
                            disabled={isBooking}
                        >
                            {isBooking ? "Booking..." : "Book Now"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                    {quote.status === "PENDING" && isExpired && (
                        <Badge variant="destructive">Expired</Badge>
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
    );
}

function JobCard({ job }: { job: JobModel }) {
    const [showTimeline, setShowTimeline] = useReactState(false);
    const queryClient = useQueryClient();

    const updateJobMutation = useMutation({
        mutationFn: async (updates: Partial<JobModel>) => {
            await JobORM.getInstance().setJobById(job.id, { ...job, ...updates });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer-jobs"] });
            toast.success("Job updated successfully");
        },
        onError: () => {
            toast.error("Failed to update job status. Please try again.");
        }
    });

    const [isPaymentOpen, setIsPaymentOpen] = useReactState(false);

    const isDepositDue = job.status === JobStatus.Booked && !job.payment_status;
    const isBalanceDue = job.status === JobStatus.Completed && job.payment_status === "deposit_paid";

    const paymentAmount = isDepositDue
        ? (job.final_quote_amount || job.estimated_cost || 0) * 0.5
        : isBalanceDue
            ? ((job.final_quote_amount || job.estimated_cost || 0) - (job.deposit_amount || 0))
            : 0;

    const paymentDesc = isDepositDue ? "50% Move Deposit" : "Final Remaining Balance";

    const handlePaymentSuccess = () => {
        updateJobMutation.mutate({
            payment_status: isDepositDue ? "deposit_paid" : "fully_paid",
            deposit_amount: isDepositDue ? paymentAmount : job.deposit_amount
        });
    };

    return (
        <Card>
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
            <CardContent className="space-y-4">
                {/* Multi-stop progress or legacy From/To */}
                {job.stops && job.stops.length > 0 ? (
                    <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">Route Progress</div>
                        {job.stops.map((stop, i) => (
                            <div key={stop.id} className="flex items-center gap-3 text-sm">
                                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                    stop.status === "completed"
                                        ? "bg-green-500 text-white"
                                        : i === (job.current_stop_index ?? 0)
                                        ? "bg-primary text-white"
                                        : "bg-slate-200 text-slate-500"
                                }`}>
                                    {stop.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                                </div>
                                <div className="flex-1">
                                    <span className="font-medium">{stop.address}</span>
                                </div>
                                <Badge variant="outline" className="text-xs capitalize">
                                    {stop.type}
                                </Badge>
                                <Badge variant={
                                    stop.status === "completed" ? "secondary" :
                                    stop.status === "pending" ? "outline" : "default"
                                } className="text-xs capitalize">
                                    {stop.status.replace("_", " ")}
                                </Badge>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="text-sm font-medium text-muted-foreground">Locations</div>
                            <div className="text-sm">
                                <span className="text-muted-foreground">From:</span> {job.pickup_address} <br />
                                <span className="text-muted-foreground">To:</span> {job.dropoff_address}
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">Original Estimate</div>
                        <div className={`text-lg font-bold ${job.final_quote_amount ? "line-through text-muted-foreground" : ""}`}>
                            ${job.estimated_cost}
                        </div>
                    </div>
                    {job.final_quote_amount && (
                        <div className="space-y-1">
                            <div className="text-sm font-medium text-primary">Final Quote Price</div>
                            <div className="text-lg font-bold text-primary">${job.final_quote_amount}</div>
                        </div>
                    )}
                    {job.ai_quote_amount && job.quote_approval_status === "pending" && (
                        <div className="space-y-1">
                            <div className="text-sm font-medium text-blue-600">AI Suggested Price</div>
                            <div className="text-lg font-bold text-blue-600">${job.ai_quote_amount}</div>
                        </div>
                    )}
                </div>

                {job.quote_approval_status === "pending" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-semibold text-amber-900">Price Update Requested</h4>
                                <p className="text-sm text-amber-800 mt-1">
                                    The moving team has finalized the inventory scan.
                                    {job.ai_quote_amount ? ` The AI calculated a suggested price of $${job.ai_quote_amount}, and the foreman has requested a final price of $${job.final_quote_amount}.` : ` The final required price is $${job.final_quote_amount}.`}
                                    {" "}Please approve this price adjustment to proceed, or reject it and contact dispatch.
                                </p>
                                <div className="flex gap-3 mt-4">
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        disabled={updateJobMutation.isPending}
                                        onClick={() => updateJobMutation.mutate({ quote_approval_status: "approved" })}
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateJobMutation.mutate({ quote_approval_status: "rejected" })}
                                        disabled={updateJobMutation.isPending}
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {job.company_id === "PENDING_ASSIGNMENT" && (
                    <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded mt-4">
                        Waiting for company assignment.
                    </div>
                )}

                {/* Payments */}
                {isDepositDue && job.quote_approval_status !== "pending" && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mt-4 flex items-center justify-between">
                        <div>
                            <div className="font-semibold text-indigo-900">Deposit Required</div>
                            <div className="text-sm text-indigo-700">Please pay the 50% deposit to confirm your move date.</div>
                        </div>
                        <Button onClick={() => setIsPaymentOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                            <CreditCard className="mr-2 h-4 w-4" /> Pay ${paymentAmount.toFixed(2)}
                        </Button>
                    </div>
                )}
                {isBalanceDue && (
                    <div className="bg-green-50 border border-green-100 rounded-lg p-4 mt-4 flex items-center justify-between">
                        <div>
                            <div className="font-semibold text-green-900">Ready for Final Payment</div>
                            <div className="text-sm text-green-700">Your move is complete! Please settle the remaining balance.</div>
                        </div>
                        <Button onClick={() => setIsPaymentOpen(true)} className="bg-green-600 hover:bg-green-700">
                            <CreditCard className="mr-2 h-4 w-4" /> Pay ${paymentAmount.toFixed(2)}
                        </Button>
                    </div>
                )}
                {job.payment_status === "fully_paid" && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 flex items-center gap-2 text-gray-700">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Paid in Full</span>
                    </div>
                )}

                <StripeCheckoutModal
                    isOpen={isPaymentOpen}
                    onClose={() => setIsPaymentOpen(false)}
                    onSuccess={handlePaymentSuccess}
                    amount={paymentAmount}
                    description={paymentDesc}
                />
                <button
                    onClick={() => setShowTimeline(!showTimeline)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
                >
                    {showTimeline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showTimeline ? "Hide Timeline" : "View Timeline"}
                </button>
                {showTimeline && (
                    <div className="pt-2 border-t">
                        <JobTimeline currentStatus={job.status} stops={job.stops} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function JobStatusBadge({ status }: { status: JobStatus }) {
    const styles = {
        [JobStatus.Unspecified]: "bg-gray-100 text-gray-800",
        [JobStatus.Quote]: "bg-blue-100 text-blue-800",
        [JobStatus.Booked]: "bg-purple-100 text-purple-800",
        [JobStatus.InProgress]: "bg-yellow-100 text-yellow-800",
        [JobStatus.EnRoute]: "bg-yellow-100 text-yellow-800",
        [JobStatus.Arrived]: "bg-yellow-100 text-yellow-800",
        [JobStatus.Loading]: "bg-yellow-100 text-yellow-800",
        [JobStatus.onWayToDropoff]: "bg-yellow-100 text-yellow-800",
        [JobStatus.Unloading]: "bg-yellow-100 text-yellow-800",
        [JobStatus.Completed]: "bg-green-100 text-green-800",
        [JobStatus.ReturningToWarehouse]: "bg-slate-100 text-slate-800",
        [JobStatus.Canceled]: "bg-red-100 text-red-800",
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles[0]}`}>
            {JobStatus[status]}
        </span>
    );
}
