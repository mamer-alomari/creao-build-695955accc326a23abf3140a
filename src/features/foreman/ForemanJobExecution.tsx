
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { JobORM, JobStatus, type JobModel, type JobStop } from "@/sdk/database/orm/orm_job";
import { type RoomInventory } from "@/hooks/use-google-vision";
import { useWorkerLocationTracker } from "@/hooks/use-worker-location";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle2, Camera, Clock, Truck, AlertTriangle, MapPin, PenTool, CreditCard, Loader2, CircleDot, Upload, Sparkles, Package, Navigation } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { SignatureCapture } from "./components/SignatureCapture";

import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useCreaoAuth } from "@/sdk/core/auth";
import { notifications } from "@/lib/notifications";
import { VehicleChecklistDialog } from "./components/VehicleChecklistDialog";
import { calculateAIQuote, type QuoteBreakdown } from "@/lib/quote-engine";
import { StripeCheckoutModal } from "@/components/StripeCheckoutModal";
import {
    getStopsFromJob,
    getCurrentStop,
    getNextStop,
    isLastStop,
    updateStopInJob,
    advanceToNextStop,
} from "@/lib/job-stops";
import { InventoryReconciliation } from "./components/InventoryReconciliation";

export function ForemanJobExecution() {
    const { user, companyId } = useCreaoAuth();
    const params = useParams({ strict: false });
    const jobId = (params as any).jobId;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [step, setStep] = useState<"status" | "equipment" | "inventory" | "quote" | "payment" | "loading">("status");
    const [showVehicleCheck, setShowVehicleCheck] = useState(false);
    const [customerSignature, setCustomerSignature] = useState<string>("");
    const [foremanSignature, setForemanSignature] = useState<string>("");
    const [quoteAmount, setQuoteAmount] = useState<number>(0);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [showReconciliation, setShowReconciliation] = useState(false);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `in-field-jobs/${companyId}/${jobId}/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload is ' + progress + '% done');
                },
                (error) => {
                    console.error("Upload Error:", error);
                    setIsUploading(false);
                    toast.error("Upload failed: " + error.message);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    setUploadedPhotos(prev => [...prev, downloadURL]);
                    setIsUploading(false);
                }
            );
        } catch (error) {
            console.error("Upload setup failed", error);
            setIsUploading(false);
        }
    };

    // Fetch Job
    const { data: job, isLoading } = useQuery({
        queryKey: ["job", jobId],
        queryFn: async () => {
            const res = await JobORM.getInstance().getJobById(jobId);
            return res[0];
        }
    });

    const updateJobMutation = useMutation({
        mutationFn: async (updates: Partial<JobModel>) => {
            if (!job) return;
            await JobORM.getInstance().setJobById(job.id, { ...job, ...updates });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["job", jobId] });
        },
        onSettled: () => {},
    });

    if (isLoading || !job) return <div>Loading Job...</div>;

    // --- Multi-stop awareness ---
    const hasMultipleStops = !!job.stops && job.stops.length > 0;
    const stops = getStopsFromJob(job);
    const currentStop = getCurrentStop(job);
    const nextStop = getNextStop(job);
    const isLast = isLastStop(job);

    // Determine the address to show in the main action card
    const displayAddress = currentStop?.address || job.pickup_address;
    const isPickupStop = currentStop?.type === "pickup" || currentStop?.type === "storage";
    const isDropoffStop = currentStop?.type === "dropoff";

    // --- Workflow Steps ---

    const handleStartJobClick = () => {
        if (job.vehicle_checklist) {
            startJob();
        } else {
            setShowVehicleCheck(true);
        }
    };

    const handleChecklistConfirm = (checklist: any) => {
        setShowVehicleCheck(false);
        updateJobMutation.mutate({
            vehicle_checklist: checklist
        }, {
            onSuccess: () => {
                startJob();
            }
        });
    };

    const startJob = () => {
        const updates: Partial<JobModel> = {
            status: JobStatus.EnRoute,
            actual_start_time: new Date().toISOString(),
        };
        if (hasMultipleStops && currentStop) {
            updates.stops = updateStopInJob(job, currentStop.id, { status: "en_route" }).stops;
        }
        updateJobMutation.mutate(updates);
    };

    const handleArrived = () => {
        const updates: Partial<JobModel> = { status: JobStatus.Arrived };
        if (hasMultipleStops && currentStop) {
            updates.stops = updateStopInJob(job, currentStop.id, {
                status: "arrived",
                actual_arrival_time: new Date().toISOString(),
            }).stops;
        }
        updateJobMutation.mutate(updates);
    };

    const handleNotifyCustomer = async () => {
        const confirmed = window.confirm("Notify customer that the team has arrived?");
        if (!confirmed) return;

        try {
            await notifications.notifyArrival(job.customer_name, "555-0000", "customer@example.com");
            toast("Customer Notified", { description: "SMS and Email sent." });
            // Navigate to inventory scan with stop context
            if (hasMultipleStops && currentStop) {
                const mode = isPickupStop ? "load" : "unload";
                navigate({ to: `/foreman/jobs/${jobId}/inventory`, search: { stopId: currentStop.id, mode } });
            } else {
                navigate({ to: `/foreman/jobs/${jobId}/inventory` });
            }
        } catch (err) {
            console.error(err);
            toast("Failed to notify", { description: "Please try again." });
        }
    };

    // Equipment
    const handleEquipmentConfirm = () => {
        updateJobMutation.mutate({
            status: JobStatus.Loading,
            equipment_ids: ["vehicle-123", "dolly-1", "blankets-10"]
        });
        setStep("inventory");
    };

    // Inventory
    const handleInventoryConfirm = () => {
        setStep("quote");
    };

    // Quote & Contract
    const handleQuoteSign = () => {
        if (!customerSignature || !foremanSignature) {
            toast.error("Both customer and foreman signatures are required.");
            return;
        }
        updateJobMutation.mutate({
            signatures: {
                customer_sign: customerSignature,
                foreman_sign: foremanSignature,
                timestamp: new Date().toISOString()
            },
            final_quote_amount: quoteAmount || (job.estimated_cost ?? undefined)
        });
        setStep("payment");
    };

    // Payment
    const handlePaymentSuccess = () => {
        updateJobMutation.mutate({
            payment_status: "deposit_paid",
            deposit_amount: (job.final_quote_amount || job.estimated_cost || 0) * 0.5
        });
        setStep("loading");
    };

    // Loading Complete — advance to next stop or transit to dropoff
    const handleLoadingComplete = () => {
        const updates: Partial<JobModel> = {
            loading_photos: uploadedPhotos.length > 0 ? uploadedPhotos : ["mock_photo_url"],
        };

        if (hasMultipleStops && currentStop) {
            const advanced = advanceToNextStop(job);
            updates.stops = advanced.stops;
            updates.current_stop_index = advanced.current_stop_index;
            // If next stop exists, set status to transit
            if (!isLast) {
                const next = stops[(job.current_stop_index ?? 0) + 1];
                updates.status = next?.type === "dropoff" ? JobStatus.onWayToDropoff : JobStatus.EnRoute;
            } else {
                updates.status = JobStatus.Completed;
            }
        } else {
            updates.status = JobStatus.onWayToDropoff;
        }

        updateJobMutation.mutate(updates);
        toast.success(isLast ? "Job Complete!" : "Stop complete! Moving to next stop.");
    };

    // Unloading complete at dropoff — show reconciliation or complete
    const handleUnloadingComplete = () => {
        if (hasMultipleStops) {
            setShowReconciliation(true);
        } else {
            updateJobMutation.mutate({ status: JobStatus.Completed });
        }
    };

    const handleReconciliationConfirm = (notes: string) => {
        setShowReconciliation(false);
        const updates: Partial<JobModel> = {};

        if (hasMultipleStops && currentStop) {
            const updatedJob = updateStopInJob(job, currentStop.id, { notes });
            const advanced = advanceToNextStop({ ...job, stops: updatedJob.stops });
            updates.stops = advanced.stops;
            updates.current_stop_index = advanced.current_stop_index;

            if (isLast) {
                updates.status = JobStatus.Completed;
            } else {
                updates.status = JobStatus.EnRoute;
            }
        } else {
            updates.status = JobStatus.Completed;
        }

        updateJobMutation.mutate(updates);
        toast.success(isLast ? "Job Complete!" : "Stop complete! Moving to next stop.");
    };

    // Return to Warehouse
    const handleReturnToWarehouse = () => {
        updateJobMutation.mutate({ status: JobStatus.ReturningToWarehouse });
        toast.success("Job Complete! Returning to Warehouse...");
        navigate({ to: "/foreman" });
    };


    // --- UI Render ---

    const currentStatusConfig = () => {
        switch (job.status) {
            case JobStatus.Booked:
                return {
                    title: "Ready to Start?",
                    action: "Start Route (Notify Customer)",
                    handler: handleStartJobClick,
                    variant: "default" as const
                };
            case JobStatus.EnRoute:
                return {
                    title: `Driving to ${isPickupStop ? "Pickup" : "Stop"}...`,
                    action: "Arrived at Location",
                    handler: handleArrived,
                    variant: "default" as const
                };
            case JobStatus.Arrived:
                return {
                    title: "On Site",
                    action: "Notify Customer Team is Here",
                    handler: handleNotifyCustomer,
                    variant: "default" as const
                };
            case JobStatus.Loading:
                return { title: "Loading is Active", action: "Finish Loading", handler: () => setStep("loading"), variant: "outline" as const };
            case JobStatus.onWayToDropoff:
                return { title: "Driving to Dropoff", action: "Arrived Dropoff", handler: () => {
                    const updates: Partial<JobModel> = { status: JobStatus.Unloading };
                    if (hasMultipleStops && currentStop) {
                        updates.stops = updateStopInJob(job, currentStop.id, { status: "unloading" }).stops;
                    }
                    updateJobMutation.mutate(updates);
                }, variant: "default" as const };
            case JobStatus.Unloading:
                return {
                    title: "Unloading is Active",
                    action: "Finish Unloading",
                    handler: () => {
                        // If multi-stop, go to unload scan first
                        if (hasMultipleStops && currentStop) {
                            navigate({ to: `/foreman/jobs/${jobId}/inventory`, search: { stopId: currentStop.id, mode: "unload" } });
                        } else {
                            handleUnloadingComplete();
                        }
                    },
                    variant: "outline" as const
                };
            case JobStatus.Completed:
                return { title: "Job Complete", action: "Return to Warehouse", handler: handleReturnToWarehouse, variant: "default" as const };
            case JobStatus.ReturningToWarehouse:
                return { title: "Returning to Warehouse", action: "Finish Route", handler: () => navigate({ to: "/foreman" }), variant: "outline" as const };
            default:
                return null;
        }
    };

    const statusConfig = currentStatusConfig();

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/foreman" })}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{job.customer_name}</h1>
                    <Badge variant="outline">{JobStatus[job.status]}</Badge>
                </div>
            </div>

            {/* Multi-stop progress indicator */}
            {hasMultipleStops && (
                <Card className="bg-slate-50">
                    <CardContent className="py-3">
                        <div className="flex items-center gap-2 text-sm font-medium mb-2">
                            <MapPin className="h-4 w-4" />
                            Stop {(job.current_stop_index ?? 0) + 1} of {stops.length}
                        </div>
                        <div className="flex gap-1">
                            {stops.map((stop, i) => (
                                <div key={stop.id} className="flex-1">
                                    <div className={`h-2 rounded-full ${
                                        stop.status === "completed" ? "bg-green-500" :
                                        i === (job.current_stop_index ?? 0) ? "bg-primary" :
                                        "bg-slate-200"
                                    }`} />
                                    <p className="text-xs text-muted-foreground mt-1 truncate" title={stop.address}>
                                        {stop.type === "pickup" ? "P" : stop.type === "dropoff" ? "D" : "S"}: {stop.address.split(",")[0]}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main Action Card */}
            {statusConfig && (
                <Card className="bg-slate-900 text-white border-0 shadow-xl">
                    <CardHeader>
                        <CardTitle>{statusConfig.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 text-slate-300 mb-4">
                            <MapPin className="h-5 w-5" />
                            {displayAddress}
                        </div>
                        <Button
                            size="lg"
                            className="w-full h-14 text-lg font-bold bg-green-500 hover:bg-green-600 text-white"
                            onClick={statusConfig.handler}
                        >
                            {statusConfig.action}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Reconciliation view at dropoff */}
            {showReconciliation && hasMultipleStops && (
                <InventoryReconciliation
                    stops={stops}
                    onConfirm={handleReconciliationConfirm}
                />
            )}

            {/* Workflow Sections */}

            {/* Step 2: Equipment */}
            {(step === "equipment" || job.equipment_ids) && (
                <Card className={step === "equipment" ? "border-primary border-2" : "opacity-80"}>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> 2. Equipment Check</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label>Select Vehicle</Label>
                                <Input defaultValue="Truck #42 (Ford Transit)" readOnly className="bg-slate-100" />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="dollies" checked />
                                    <Label htmlFor="dollies">Dollies (2)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="pads" checked />
                                    <Label htmlFor="pads">Moving Pads (20)</Label>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    {step === "equipment" && (
                        <CardFooter>
                            <Button onClick={handleEquipmentConfirm} className="w-full">Confirm Equipment</Button>
                        </CardFooter>
                    )}
                </Card>
            )}

            {/* Step 3: AI Inventory */}
            {(step === "inventory" || job.final_inventory_data) && (
                <Card className={step === "inventory" ? "border-primary border-2" : "opacity-80"}>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" /> 3. Walkthrough & Scan</CardTitle></CardHeader>
                    <CardContent>
                        {job.final_inventory_data ? (
                            <div className="text-green-600 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" /> Inventory Completed
                            </div>
                        ) : (
                            <div className="border-2 border-dashed p-8 text-center rounded-lg bg-slate-50">
                                <p>Manage Inventory in dedicated view</p>
                                <Button variant="outline" className="mt-4" onClick={() => {
                                    if (hasMultipleStops && currentStop) {
                                        const mode = isPickupStop ? "load" : "unload";
                                        navigate({ to: `/foreman/jobs/${jobId}/inventory`, search: { stopId: currentStop.id, mode } });
                                    } else {
                                        navigate({ to: `/foreman/jobs/${jobId}/inventory` });
                                    }
                                }}>
                                    <Camera className="mr-2 h-4 w-4" /> Go to Scan Items
                                </Button>
                            </div>
                        )}
                        <div className="mt-4 text-sm text-muted-foreground">
                            Using inventory from Quote ({JSON.parse(job.inventory_data || "[]").length} rooms)...
                        </div>
                    </CardContent>
                    {step === "inventory" && (
                        <CardFooter>
                            <Button onClick={() => setStep("quote")} variant="ghost" className="w-full">Skip to Quote (Debug)</Button>
                        </CardFooter>
                    )}
                </Card>
            )}

            {/* Step 4: Quote & Contract */}
            {(step === "quote" || job.signatures) && (
                <Card className={step === "quote" ? "border-primary border-2" : "opacity-80"}>
                    <CardHeader><CardTitle className="flex items-center gap-2"><PenTool className="h-5 w-5" /> 4. Contract & Signature</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {/* AI Quote Estimate */}
                        {job.final_inventory_data && (() => {
                            try {
                                const items = JSON.parse(job.final_inventory_data);
                                if (items.length > 0) {
                                    const aiQuote = calculateAIQuote(items, job.distance, job.classification);
                                    if (quoteAmount === 0 && step === "quote") {
                                        setTimeout(() => setQuoteAmount(aiQuote.totalEstimate), 0);
                                    }

                                    if (job.ai_quote_amount !== aiQuote.totalEstimate && !updateJobMutation.isPending) {
                                        setTimeout(() => {
                                            updateJobMutation.mutate({ ai_quote_amount: aiQuote.totalEstimate });
                                        }, 100);
                                    }

                                    return (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                                            <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
                                                <Sparkles className="h-4 w-4" />
                                                AI-Generated Quote Estimate
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Labor ({aiQuote.details.estimatedHours}h)</span>
                                                    <span className="font-medium">${aiQuote.laborCost}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Fuel ({aiQuote.details.distanceMiles}mi)</span>
                                                    <span className="font-medium">${aiQuote.fuelCost}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Materials</span>
                                                    <span className="font-medium">${aiQuote.materialsCost}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Insurance</span>
                                                    <span className="font-medium">${aiQuote.insuranceCost}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t border-blue-200 font-bold text-blue-900">
                                                <span>AI Suggested Total</span>
                                                <span>${aiQuote.totalEstimate}</span>
                                            </div>
                                            <p className="text-xs text-blue-600">
                                                {aiQuote.details.itemCount} items · {aiQuote.details.totalVolumeCuFt} cu ft · {aiQuote.details.totalWeightLbs} lbs
                                                {job.classification === "interstate" ? " · +15% interstate" : ""}
                                            </p>
                                        </div>
                                    );
                                }
                            } catch { /* ignore parse errors */ }
                            return null;
                        })()}
                        <div className="flex justify-between items-center text-lg font-bold">
                            <span>Final Quote Amount</span>
                            {step === "quote" ? (
                                <div className="flex items-center gap-1">
                                    <span className="text-lg">$</span>
                                    <Input
                                        type="number"
                                        value={quoteAmount || job.estimated_cost || 0}
                                        onChange={(e) => {
                                            setQuoteAmount(Number(e.target.value));
                                            if (job.quote_approval_status === "pending" || job.quote_approval_status === "rejected") {
                                                updateJobMutation.mutate({ quote_approval_status: undefined as any });
                                            }
                                        }}
                                        className="w-32 text-right text-lg font-bold h-10"
                                        disabled={job.quote_approval_status === "pending"}
                                    />
                                </div>
                            ) : (
                                <span>${job.final_quote_amount || job.estimated_cost}</span>
                            )}
                        </div>

                        {/* Quote Approval Warnings */}
                        {step === "quote" && quoteAmount > 0 && Math.abs(quoteAmount - (job.estimated_cost || 0)) > 1 && (
                            <div className="p-3 bg-amber-50 text-amber-800 rounded-md flex items-start gap-2 text-sm mt-4">
                                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">Price Change Requires Approval</p>
                                    <p>The final quote (${quoteAmount}) differs from the original estimate (${job.estimated_cost}). The customer must approve this new price.</p>
                                </div>
                            </div>
                        )}
                        {job.quote_approval_status === "pending" && (
                            <div className="p-3 bg-blue-50 text-blue-800 rounded-md flex items-center gap-2 text-sm mt-2">
                                <Clock className="h-4 w-4 flex-shrink-0" />
                                <strong>Waiting for customer approval...</strong>
                            </div>
                        )}
                        {job.quote_approval_status === "approved" && (
                            <div className="p-3 bg-green-50 text-green-800 rounded-md flex items-center gap-2 text-sm mt-2">
                                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                                <strong>Customer approved the new price!</strong>
                            </div>
                        )}
                        {job.quote_approval_status === "rejected" && (
                            <div className="p-3 bg-red-50 text-red-800 rounded-md flex items-center gap-2 text-sm mt-2">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                <strong>Customer rejected the new price. Please adjust.</strong>
                            </div>
                        )}

                        <Separator />
                        <SignatureCapture
                            label="Customer Signature"
                            onCapture={setCustomerSignature}
                            value={customerSignature || undefined}
                            disabled={step !== "quote"}
                        />
                        <SignatureCapture
                            label="Foreman Signature"
                            onCapture={setForemanSignature}
                            value={foremanSignature || undefined}
                            disabled={step !== "quote"}
                        />
                    </CardContent>
                    {step === "quote" && (
                        <CardFooter className="flex-col gap-2">
                            {quoteAmount > 0 && Math.abs(quoteAmount - (job.estimated_cost || 0)) > 1 && job.quote_approval_status !== "approved" ? (
                                <Button
                                    onClick={async () => {
                                        updateJobMutation.mutate({
                                            final_quote_amount: quoteAmount,
                                            quote_approval_status: "pending"
                                        });
                                        try {
                                            await notifications.notifyPriceChange(
                                                job.customer_name,
                                                job.estimated_cost || 0,
                                                quoteAmount,
                                                "555-0000",
                                                "customer@example.com"
                                            );
                                            toast.success("Customer notified of price update");
                                        } catch (e) {
                                            console.error("Failed to notify customer", e);
                                        }
                                    }}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                                    disabled={job.quote_approval_status === "pending" || updateJobMutation.isPending}
                                >
                                    {job.quote_approval_status === "pending" ? "Approval Requested..." : "Request Customer Approval"}
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleQuoteSign}
                                    className="w-full"
                                    disabled={!customerSignature || !foremanSignature || updateJobMutation.isPending}
                                >
                                    Sign & Accept Contract
                                </Button>
                            )}
                        </CardFooter>
                    )}
                </Card>
            )}

            {/* Step 5: Payment */}
            {(step === "payment" || job.payment_status) && (
                <Card className={step === "payment" ? "border-primary border-2" : "opacity-80"}>
                    <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> 5. Deposit Collection</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-blue-50 text-blue-800 rounded">
                            Please collect 50% Deposit: <strong>${((job.estimated_cost || 0) * 0.5).toFixed(2)}</strong>
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => setIsPaymentModalOpen(true)}>
                            <CreditCard className="mr-2 h-4 w-4" /> Charge Card (Stripe)
                        </Button>
                    </CardContent>
                    {step === "payment" && (
                        <CardFooter>
                            <Button onClick={handlePaymentSuccess} variant="ghost" className="w-full">Skip Payment (Cash/Check)</Button>
                        </CardFooter>
                    )}
                </Card>
            )}

            {/* Step 6: Loading */}
            {(step === "loading") && (
                <Card className="border-primary border-2">
                    <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> 6. Loading</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-center py-8">
                            <p className="mb-4">Crew is loading the truck...</p>
                            <div className="flex flex-col items-center gap-4">
                                <Button variant="outline" className="relative">
                                    <Camera className="mr-2 h-4 w-4" />
                                    {isUploading ? "Uploading..." : "Photo of Loaded Truck"}
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                        disabled={isUploading}
                                    />
                                </Button>
                                {uploadedPhotos.length > 0 && (
                                    <div className="text-sm text-muted-foreground">
                                        {uploadedPhotos.length} photo(s) uploaded
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleLoadingComplete} className="w-full" size="lg" disabled={isUploading}>Truck Loaded & Closed</Button>
                    </CardFooter>
                </Card>
            )}

            {/* Vehicle Checklist Dialog */}
            <VehicleChecklistDialog
                isOpen={showVehicleCheck}
                onClose={() => setShowVehicleCheck(false)}
                onConfirm={handleChecklistConfirm}
                vehicleName="Assigned Vehicle"
            />

            <StripeCheckoutModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={handlePaymentSuccess}
                amount={(job.final_quote_amount || job.estimated_cost || 0) * 0.5}
                description="50% Deposit for Move"
            />
        </div>
    );
}
