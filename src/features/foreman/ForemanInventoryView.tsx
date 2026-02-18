import { useState, useRef } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { JobORM, type JobModel } from "@/sdk/database/orm/orm_job";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
    ArrowLeft, Plus, Camera, Trash2, CheckCircle2,
    Loader2, AlertTriangle, Save, X
} from "lucide-react";
import { toast } from "sonner";
import { useAnalyzeRoomImage } from "@/hooks/use-google-vision";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ITEM_CATEGORIES } from "@/hooks/use-google-vision";

// Define a structured item type matching our schema/needs
interface InventoryItem {
    id: string;
    name: string;
    category: string;
    quantity: number;
    description?: string;
    imageUrl?: string;
    isAiDetected?: boolean;
}

export function ForemanInventoryView() {
    const { jobId } = useParams({ strict: false }) as { jobId: string };
    const navigate = useNavigate();
    const queryClient = useQueryClient();

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
                // Parse existing data
                const initialData = jobData.final_inventory_data || jobData.inventory_data || "[]";
                try {
                    const parsed = JSON.parse(initialData);
                    // Normalize legacy data if it exists
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
            return jobData;
        },
        staleTime: Infinity // Don't refetch automatically to avoid wiping local unsaved changes
    });

    // Save Mutation
    const updateJobMutation = useMutation({
        mutationFn: async (updates: Partial<JobModel>) => {
            if (!job) return;
            await JobORM.getInstance().setJobById(job.id, { ...job, ...updates });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["job", jobId] });
        }
    });

    // --- Actions ---

    const handleCameraClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset form state for new scan
        setIsScannerOpen(true);
        setIsAnalyzing(true);

        // Create local preview
        const objectUrl = URL.createObjectURL(file);
        setCurrentImage(objectUrl);

        try {
            // Call AI Hook
            const results = await analyzeMutation.mutateAsync({
                imageFile: file,
                roomType: "other" // Pass "living_room" or let user select room first? "other" is safe fallback.
            });

            if (results && results.length > 0) {
                // Auto-fill with the first/most prominent item
                // In a real multi-item scan, we might show a list to select from, 
                // but for "Redundancy" of 1 item per photo, we pick the first.
                const topItem = results[0];
                setCurrentItem({
                    id: `scan-${Date.now()}`,
                    name: topItem.name,
                    category: topItem.category,
                    quantity: topItem.quantity,
                    description: topItem.description || "",
                    imageUrl: objectUrl, // Store reference to image (in real app, upload this to Storage first!)
                    isAiDetected: true
                });
                toast.success(`AI identified: ${topItem.name}`);
            } else {
                toast("AI found no items", { description: "Please enter details manually." });
                setCurrentItem(prev => ({ ...prev, imageUrl: objectUrl, name: "", isAiDetected: false }));
            }
        } catch (error) {
            console.error("AI Analysis failed", error);
            toast.error("AI Scanning Failed", { description: "Connection lost or error. Please input manually." });
            // Fallback: User sees empty form with image
            setCurrentItem(prev => ({ ...prev, imageUrl: objectUrl, name: "", isAiDetected: false }));
        } finally {
            setIsAnalyzing(false);
            // Clear input so same file can be selected again if needed
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
        updateJobMutation.mutate({
            final_inventory_data: JSON.stringify(items),
        }, {
            onSuccess: () => {
                toast.success("Inventory Saved");
                navigate({ to: `/foreman/jobs/${jobId}/execute` });
            }
        });
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
                    <h1 className="text-2xl font-bold">Inventory Management</h1>
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
                            <><Camera className="mr-2 h-6 w-6" /> Scan Item with AI</>
                        )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        Taking a photo will auto-detect item details.
                        If unsure, you can edit before saving.
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
                        <Card key={item.id} className="overflow-hidden">
                            <div className="flex items-start p-3 gap-3">
                                {/* Thumbnail */}
                                <div className="h-16 w-16 bg-slate-100 rounded-md flex-shrink-0 overflow-hidden border">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-slate-300">
                                            <CheckCircle2 className="h-6 w-6" />
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold truncate pr-2">{item.name}</h4>
                                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-medium whitespace-nowrap">
                                            Qty: {item.quantity}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground capitalize">{item.category.replace('_', ' ')}</p>
                                    {item.description && (
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
