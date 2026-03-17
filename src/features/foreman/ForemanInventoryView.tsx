import { useState, useRef } from "react";
import { useParams, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { JobORM, type JobModel } from "@/sdk/database/orm/orm_job";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
    ArrowLeft, Plus, Camera, Trash2, CheckCircle2,
    Loader2, AlertTriangle, Save, X
} from "lucide-react";
import { toast } from "sonner";
import { useAnalyzeRoomImage, type ScanMode } from "@/hooks/use-google-vision";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ITEM_CATEGORIES } from "@/hooks/use-google-vision";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getStopsFromJob, updateStopInJob } from "@/lib/job-stops";

// Define a structured item type matching our schema/needs
interface InventoryItem {
    id: string;
    name: string;
    category: string;
    quantity: number;
    description?: string;
    imageUrl?: string;
    isAiDetected?: boolean;
    damageDetected?: boolean;
    conditionNotes?: string;
    confidenceScore?: number;
}

export function ForemanInventoryView() {
    const { jobId } = useParams({ strict: false }) as { jobId: string };
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Read stop context from search params
    const search = useSearch({ strict: false }) as { stopId?: string; mode?: "load" | "unload" };
    const stopId = search?.stopId;
    const scanMode: ScanMode = search?.mode || "detect";

    // State
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Scanned Item State (Redundancy UI)
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [currentItem, setCurrentItem] = useState<InventoryItem>({
        id: "",
        name: "",
        category: "other",
        quantity: 1,
        description: "",
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const analyzeMutation = useAnalyzeRoomImage();

    // Data Fetching
    const { data: job, isLoading } = useQuery({
        queryKey: ["job", jobId],
        queryFn: async () => {
            const res = await JobORM.getInstance().getJobById(jobId);
            const jobData = res[0];

            if (jobData) {
                // If stop-aware, load from stop's inventory; otherwise legacy
                if (stopId && jobData.stops) {
                    const stop = jobData.stops.find(s => s.id === stopId);
                    if (stop) {
                        const raw = scanMode === "unload" ? stop.inventory_unloaded : stop.inventory_loaded;
                        if (raw) {
                            try {
                                const parsed = JSON.parse(raw);
                                if (Array.isArray(parsed)) setItems(parsed);
                            } catch { /* ignore */ }
                        }
                    }
                } else {
                    // Legacy path
                    const initialData = jobData.final_inventory_data || jobData.inventory_data || "[]";
                    try {
                        const parsed = JSON.parse(initialData);
                        if (Array.isArray(parsed)) {
                            const normalized = parsed.map((i: any, idx: number) => {
                                if (typeof i === 'string') {
                                    return {
                                        id: `legacy-${idx}`,
                                        name: i,
                                        category: "other",
                                        quantity: 1
                                    } as InventoryItem;
                                }
                                return { ...i, id: i.id || `item-${idx}` };
                            });
                            setItems(normalized);
                        }
                    } catch (e) {
                        console.error("Failed to parse inventory", e);
                    }
                }
            }
            return jobData;
        },
        staleTime: Infinity
    });

    // Save Mutation
    const updateJobMutation = useMutation({
        mutationFn: async (updates: Partial<JobModel>) => {
            if (!job) return;
            const jobRef = doc(db, "jobs", jobId);
            await updateDoc(jobRef, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["job", jobId] });
        }
    });

    // Derive stop info for header
    const currentStop = stopId && job?.stops
        ? job.stops.find(s => s.id === stopId)
        : undefined;
    const stopLabel = currentStop
        ? `${scanMode === "unload" ? "Unloading" : "Loading"} Scan — Stop ${currentStop.sequence + 1}: ${currentStop.address}`
        : undefined;

    // --- Actions ---

    const handleCameraClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScannerOpen(true);
        setIsAnalyzing(true);

        const objectUrl = URL.createObjectURL(file);
        setCurrentImage(objectUrl);

        try {
            const results = await analyzeMutation.mutateAsync({
                imageFile: file,
                roomType: "other",
                mode: scanMode,
            });

            if (results && results.length > 0) {
                const topItem = results[0];
                setCurrentItem({
                    id: `scan-${Date.now()}`,
                    name: topItem.name,
                    category: topItem.category,
                    quantity: topItem.quantity,
                    description: topItem.description || "",
                    imageUrl: objectUrl,
                    isAiDetected: true,
                    damageDetected: topItem.damageDetected ?? false,
                    conditionNotes: topItem.conditionNotes ?? undefined,
                    confidenceScore: topItem.confidenceScore ?? undefined,
                });
                toast.success(`AI identified: ${topItem.name}`);
            } else {
                toast("AI found no items", { description: "Please enter details manually." });
                setCurrentItem(prev => ({ ...prev, imageUrl: objectUrl, name: "", isAiDetected: false }));
            }
        } catch (error) {
            console.error("AI Analysis failed", error);
            const errorMessage = error instanceof Error ? error.message : "Connection lost or error. Please input manually.";
            toast.error("AI Scanning Failed", { description: errorMessage });
            setCurrentItem(prev => ({ ...prev, imageUrl: objectUrl, name: "", isAiDetected: false }));
        } finally {
            setIsAnalyzing(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleManualAddItem = () => {
        setCurrentImage(null);
        setCurrentItem({
            id: `manual-${Date.now()}`,
            name: "",
            category: "other",
            quantity: 1,
            description: ""
        });
        setIsScannerOpen(true);
    };

    const handleSaveItem = () => {
        if (!currentItem.name.trim()) {
            toast.error("Item name is required");
            return;
        }

        setItems(prev => [...prev, { ...currentItem, id: currentItem.id || `item-${Date.now()}` }]);
        setIsScannerOpen(false);
        toast.success("Item Added");
    };

    const handleRemoveItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const handleComplete = () => {
        const serialized = JSON.stringify(items);

        if (stopId && job?.stops) {
            // Write to the stop's inventory
            const field = scanMode === "unload" ? "inventory_unloaded" : "inventory_loaded";
            const updatedJob = updateStopInJob(job, stopId, { [field]: serialized });
            updateJobMutation.mutate(
                { stops: updatedJob.stops, final_inventory_data: serialized },
                {
                    onSuccess: () => {
                        toast.success("Inventory Saved");
                        navigate({ to: `/foreman/jobs/${jobId}/execute` });
                    }
                }
            );
        } else {
            // Legacy path
            updateJobMutation.mutate(
                { final_inventory_data: serialized },
                {
                    onSuccess: () => {
                        toast.success("Inventory Saved");
                        navigate({ to: `/foreman/jobs/${jobId}/execute` });
                    }
                }
            );
        }
    };

    if (isLoading || !job) return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Loading Job Inventory...</p>
        </div>
    );

    return (
        <div className="container mx-auto py-8 px-4 max-w-3xl pb-32">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate({ to: `/foreman/jobs/${jobId}` })}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">
                        {stopLabel || "Scan Items"}
                    </h1>
                    <p className="text-muted-foreground">Job: {job.customer_name}</p>
                </div>
            </div>

            {/* Hidden Camera Input */}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Main Action Card */}
            <Card className="mb-6 border-2 border-primary/10">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Items Scanned: {items.length}</span>
                        <Button variant="outline" size="sm" onClick={handleManualAddItem}>
                            <Plus className="h-4 w-4 mr-1" /> Manual Entry
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Button
                        size="lg"
                        className="w-full h-16 text-lg shadow-md"
                        onClick={handleCameraClick}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing Image...</>
                        ) : (
                            <><Camera className="mr-2 h-6 w-6" /> Scan with AI</>
                        )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        Taking a photo will auto-detect item details.
                        {scanMode !== "detect" && " Damage assessment is enabled for this scan."}
                    </p>
                </CardContent>
            </Card>

            {/* Item List */}
            <div className="space-y-3">
                {items.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-slate-50">
                        <Camera className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No items scanned yet.</p>
                        <p className="text-sm">Tap "Scan Item" to begin.</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <Card key={item.id} className={`overflow-hidden ${item.damageDetected ? "border-red-300 border-2" : ""}`}>
                            <div className="flex items-start p-3 gap-3">
                                {/* Thumbnail */}
                                <div className="h-16 w-16 bg-slate-100 rounded-md flex-shrink-0 overflow-hidden border relative">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-slate-300">
                                            <CheckCircle2 className="h-6 w-6" />
                                        </div>
                                    )}
                                    {item.damageDetected && (
                                        <div className="absolute top-0 right-0 bg-red-500 text-white rounded-bl px-1">
                                            <AlertTriangle className="h-3 w-3" />
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-1.5">
                                            <h4 className="font-semibold truncate pr-2">{item.name}</h4>
                                            {/* Confidence dot */}
                                            {item.confidenceScore != null && (
                                                <span
                                                    className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                                                        item.confidenceScore > 0.8
                                                            ? "bg-green-500"
                                                            : item.confidenceScore >= 0.5
                                                            ? "bg-yellow-500"
                                                            : "bg-red-500"
                                                    }`}
                                                    title={`Confidence: ${Math.round(item.confidenceScore * 100)}%`}
                                                />
                                            )}
                                        </div>
                                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-medium whitespace-nowrap">
                                            Qty: {item.quantity}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground capitalize">{item.category.replace('_', ' ')}</p>
                                    {item.conditionNotes && (
                                        <p className="text-xs text-amber-700 mt-0.5">{item.conditionNotes}</p>
                                    )}
                                    {item.description && !item.conditionNotes && (
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.description}</p>
                                    )}
                                </div>

                                {/* Actions */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleRemoveItem(item.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Sticky Bottom Complete Action */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:relative md:bg-transparent md:border-0 md:shadow-none md:p-0 md:mt-8">
                <div className="max-w-3xl mx-auto">
                    <Button
                        size="lg"
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 shadow"
                        onClick={handleComplete}
                        disabled={items.length === 0}
                    >
                        <CheckCircle2 className="mr-2 h-5 w-5" /> All Items Scanned - Finish
                    </Button>
                </div>
            </div>

            {/* Redundancy UI / Add Item Dialog */}
            <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{currentImage ? "Review Scan" : "Add Item"}</DialogTitle>
                        <DialogDescription>
                            {currentImage
                                ? "AI detection complete. Verify or edit details below."
                                : "Enter item details manually."}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Image Preview */}
                    {currentImage && (
                        <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden mb-4">
                            <img src={currentImage} alt="Preview" className="w-full h-full object-contain" />
                            {isAnalyzing && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Item Name</Label>
                            <Input
                                id="name"
                                value={currentItem.name}
                                onChange={(e) => setCurrentItem(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Sofa, Box of Books"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={currentItem.category}
                                    onValueChange={(val) => setCurrentItem(prev => ({ ...prev, category: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ITEM_CATEGORIES.map(cat => (
                                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="quantity">Quantity</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    min={1}
                                    value={currentItem.quantity}
                                    onChange={(e) => setCurrentItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description / Notes</Label>
                            <Textarea
                                id="description"
                                value={currentItem.description}
                                onChange={(e) => setCurrentItem(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Condition, location, specific handling..."
                            />
                        </div>

                        {/* Damage fields for load/unload modes */}
                        {scanMode !== "detect" && (
                            <div className="grid gap-2 border-t pt-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="damageDetected"
                                        checked={currentItem.damageDetected || false}
                                        onChange={(e) => setCurrentItem(prev => ({ ...prev, damageDetected: e.target.checked }))}
                                        className="h-4 w-4"
                                    />
                                    <Label htmlFor="damageDetected" className="text-sm font-medium text-red-700">
                                        Damage Detected
                                    </Label>
                                </div>
                                <div className="grid gap-1">
                                    <Label htmlFor="conditionNotes" className="text-sm">Condition Notes</Label>
                                    <Textarea
                                        id="conditionNotes"
                                        value={currentItem.conditionNotes || ""}
                                        onChange={(e) => setCurrentItem(prev => ({ ...prev, conditionNotes: e.target.value }))}
                                        placeholder="Describe any damage or condition issues..."
                                        rows={2}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsScannerOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveItem}>
                            <Save className="mr-2 h-4 w-4" /> Save Item
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
