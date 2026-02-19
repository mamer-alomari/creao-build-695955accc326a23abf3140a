
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { JobORM, JobStatus, type JobModel } from "@/sdk/database/orm/orm_job";
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

export function ForemanJobExecution() {
    const { user, companyId } = useCreaoAuth(); // Need companyId for path
    const params = useParams({ strict: false });
    const jobId = (params as any).jobId;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [step, setStep] = useState<"status" | "equipment" | "inventory" | "quote" | "payment" | "loading">("status");
    const [showVehicleCheck, setShowVehicleCheck] = useState(false);
    const [customerSignature, setCustomerSignature] = useState<string>("");
    const [foremanSignature, setForemanSignature] = useState<string>("");
    const [quoteAmount, setQuoteAmount] = useState<number>(0);

    // Auto-advance step if returning from inventory
    useEffect(() => {
        // If we have final inventory but no signatures, we are likely in Quote phase
        // Accessing 'job' here requires it to be in dependency, but 'job' is fetched below.
        // We'll handle this in the render/query success if needed, or rely on manual 'actions' if user re-enters.
        // Actually best to leave default as 'status' -> allowing them to pick up where left off if we added logic.
    }, []);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];

        setIsUploading(true);
        try {
            // Path: gs://abadai-da22b.firebasestorage.app/in-field-jobs
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
        onSettled: () => {
            // Prevents unhandled rejection if component unmounts before mutation settles
        },
    });

    if (isLoading || !job) return <div>Loading Job...</div>;

    // --- Workflow Steps ---

    // 1. Start Job (En Route)
    const handleStartJobClick = () => {
        console.log("Start Job Clicked", job.vehicle_checklist);
        // If checklist is already done, proceed directly (retry case)
        if (job.vehicle_checklist) {
            console.log("Checklist already done, starting job");
            startJob();
        } else {
            console.log("Showing vehicle checklist");
            // Show checklist
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
        updateJobMutation.mutate({
            status: JobStatus.EnRoute,
            actual_start_time: new Date().toISOString()
        });
    };

    const handleArrived = () => {
        updateJobMutation.mutate({ status: JobStatus.Arrived });
        // We stay on the "status" step to show the "Notify Customer" action now
    };

    const handleNotifyCustomer = async () => {
        const confirmed = window.confirm("Notify customer that the team has arrived?");
        if (!confirmed) return;

        try {
            await notifications.notifyArrival(job.customer_name, "555-0000", "customer@example.com"); // Mock data for now, ideally from job
            toast("Customer Notified", { description: "SMS and Email sent." });
            navigate({ to: `/foreman/jobs/${jobId}/inventory` });
        } catch (err) {
            console.error(err);
            toast("Failed to notify", { description: "Please try again." });
        }
    };

    // 2. Equipment
    const handleEquipmentConfirm = () => {
        // Mock saving equipment
        updateJobMutation.mutate({
            status: JobStatus.Loading, // Or 'Estimating' if we strictly follow flow
            equipment_ids: ["vehicle-123", "dolly-1", "blankets-10"]
        });
        setStep("inventory");
    };

    // 3. Inventory (Mock AI Scan)
    const handleInventoryConfirm = () => {
        // Mock finalizing inventory
        setStep("quote");
    };

    // 4. Quote & Contract
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

    // 5. Payment
    const handlePaymentCollect = () => {
        updateJobMutation.mutate({
            payment_status: "deposit_paid",
            deposit_amount: (job.estimated_cost || 0) * 0.5
        });
        setStep("loading");
    };

    // 6. Loading Complete
    const handleLoadingComplete = () => {
        updateJobMutation.mutate({
            status: JobStatus.onWayToDropoff,
            loading_photos: uploadedPhotos.length > 0 ? uploadedPhotos : ["mock_photo_url"]
        });
        toast.success("Truck Loaded! Customer Notified.");
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
                    title: "Driving to Pickup...",
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
                return { title: "Driving to Dropoff", action: "Arrived Dropoff", handler: () => updateJobMutation.mutate({ status: JobStatus.Unloading }), variant: "default" as const };
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

            {/* Main Action Card */}
            {statusConfig && (
                <Card className="bg-slate-900 text-white border-0 shadow-xl">
                    <CardHeader>
                        <CardTitle>{statusConfig.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 text-slate-300 mb-4">
                            <MapPin className="h-5 w-5" />
                            {job.pickup_address}
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
                                <Button variant="outline" className="mt-4" onClick={() => navigate({ to: `/foreman/jobs/${jobId}/inventory` })}>
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
                            {/* If they come back here without finishing, they can go to scan or skip */}
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
                                    // Auto-set quote amount if not yet set
                                    if (quoteAmount === 0 && step === "quote") {
                                        setTimeout(() => setQuoteAmount(aiQuote.totalEstimate), 0);
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
                                        onChange={(e) => setQuoteAmount(Number(e.target.value))}
                                        className="w-32 text-right text-lg font-bold h-10"
                                    />
                                </div>
                            ) : (
                                <span>${job.final_quote_amount || job.estimated_cost}</span>
                            )}
                        </div>
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
                        <CardFooter>
                            <Button
                                onClick={handleQuoteSign}
                                className="w-full"
                                disabled={!customerSignature || !foremanSignature}
                            >
                                Sign & Accept Contract
                            </Button>
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
                        <Button variant="outline" className="w-full">
                            <CreditCard className="mr-2 h-4 w-4" /> Charge Card (Stripe)
                        </Button>
                    </CardContent>
                    {step === "payment" && (
                        <CardFooter>
                            <Button onClick={handlePaymentCollect} className="w-full">Confirm Payment</Button>
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
                vehicleName="Assigned Vehicle" // Could fetch actual vehicle name if needed
            />
        </div>
    );
}
