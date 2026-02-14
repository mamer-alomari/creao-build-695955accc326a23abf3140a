
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
import { ArrowLeft, Truck, Package, CreditCard, PenTool, Camera, Navigation, MapPin } from "lucide-react";
import { useState, useRef } from "react";
import { format } from "date-fns";
// import ReactSignatureCanvas from 'react-signature-canvas'; // Would need to install

export function ForemanJobExecution() {
    const { jobId } = useParams({ from: "/foreman/jobs/$jobId" });
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [step, setStep] = useState<"status" | "equipment" | "inventory" | "quote" | "payment" | "loading">("status");

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
        }
    });

    if (isLoading || !job) return <div>Loading Job...</div>;

    // --- Workflow Steps ---

    // 1. Start Job (En Route)
    const handleStartJob = () => {
        // Trigger notification logic here (cloud function or simple status update)
        updateJobMutation.mutate({
            status: JobStatus.EnRoute,
            actual_start_time: new Date().toISOString()
        });
    };

    const handleArrived = () => {
        updateJobMutation.mutate({ status: JobStatus.Arrived });
        setStep("equipment");
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
        updateJobMutation.mutate({
            signatures: {
                customer_sign: "mock_signature_base64",
                foreman_sign: "mock_signature_base64",
                timestamp: new Date().toISOString()
            },
            final_quote_amount: job.estimated_cost ?? undefined // Allow edit in real UI
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
            loading_photos: ["mock_photo_url"]
        });
        alert("Truck Loaded! Customer Notified.");
        navigate({ to: "/foreman" });
    };


    // --- UI Render ---

    const currentStatusConfig = () => {
        switch (job.status) {
            case JobStatus.Booked:
                return {
                    title: "Ready to Start?",
                    action: "Start Route (Notify Customer)",
                    handler: handleStartJob,
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
                return { title: "On Site", action: "Continue setup", handler: () => setStep("equipment"), variant: "outline" as const };
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
                        <div className="border-2 border-dashed p-8 text-center rounded-lg bg-slate-50">
                            <p>Tap to start AI Room Scan</p>
                            <Button variant="outline" className="mt-4">
                                <Camera className="mr-2 h-4 w-4" /> Open Camera
                            </Button>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">
                            Using inventory from Quote ({JSON.parse(job.inventory_data || "[]").length} rooms)...
                        </div>
                    </CardContent>
                    {step === "inventory" && (
                        <CardFooter>
                            <Button onClick={handleInventoryConfirm} className="w-full">Finalize Inventory</Button>
                        </CardFooter>
                    )}
                </Card>
            )}

            {/* Step 4: Quote & Contract */}
            {(step === "quote" || job.signatures) && (
                <Card className={step === "quote" ? "border-primary border-2" : "opacity-80"}>
                    <CardHeader><CardTitle className="flex items-center gap-2"><PenTool className="h-5 w-5" /> 4. Contract & Signature</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between text-lg font-bold">
                            <span>Total Estimate</span>
                            <span>${job.estimated_cost}</span>
                        </div>
                        <Separator />
                        <div className="h-32 bg-slate-100 rounded border flex items-center justify-center text-muted-foreground">
                            Signature Pad Placeholder
                        </div>
                    </CardContent>
                    {step === "quote" && (
                        <CardFooter>
                            <Button onClick={handleQuoteSign} className="w-full">Sign & Accept</Button>
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
                            <Button variant="outline">
                                <Camera className="mr-2 h-4 w-4" /> Photo of Loaded Truck
                            </Button>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleLoadingComplete} className="w-full" size="lg">Truck Loaded & Closed</Button>
                    </CardFooter>
                </Card>
            )}

        </div>
    );
}
