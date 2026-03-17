import { useState } from "react";
import { toast } from "sonner";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Truck, Calendar as CalendarIcon, MapPin, CheckCircle2, User, Mail, Phone, Plus, Trash2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { RoomInventoryManager } from "@/components/room-inventory";
import { type RoomInventory } from "@/hooks/use-google-vision";
import { QuoteORM } from "@/sdk/database/orm/orm_quote";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { classifyJobType } from "@/lib/address-utils";
import { useDistanceMatrix } from "@/hooks/use-distance-matrix";
import { calculateRouteDistance } from "@/lib/route-distance";
import { calculateAIQuote, type QuoteBreakdown } from "@/lib/quote-engine";


export const Route = createFileRoute("/get-quote")({
    component: GetQuoteView,
});

type QuoteStep = "logistics" | "inventory" | "review" | "success";

interface StopEntry {
    address: string;
    type: "pickup" | "dropoff" | "storage";
}

export function GetQuoteView() {
    const [step, setStep] = useState<QuoteStep>("logistics");

    // Multi-stop state
    const [stops, setStops] = useState<StopEntry[]>([
        { address: "", type: "pickup" },
        { address: "", type: "dropoff" },
    ]);

    const [date, setDate] = useState<Date | undefined>(undefined);

    // Contact State
    const [contactName, setContactName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactPhone, setContactPhone] = useState("");

    // Backend State
    const [submittedQuoteId, setSubmittedQuoteId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Inventory State
    const [rooms, setRooms] = useState<RoomInventory[]>([]);

    // Quote calculation state
    const [quoteBreakdown, setQuoteBreakdown] = useState<QuoteBreakdown | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const { calculateDistance } = useDistanceMatrix();

    const totalItems = rooms.reduce((acc, room) => acc + room.items.filter(i => i.quantity > 0).length, 0);

    // Derived values
    const firstPickup = stops.find(s => s.type === "pickup")?.address || "";
    const lastDropoff = [...stops].reverse().find(s => s.type === "dropoff")?.address || "";

    const updateStop = (index: number, updates: Partial<StopEntry>) => {
        setStops(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
    };

    const addStop = () => {
        setStops(prev => [...prev.slice(0, -1), { address: "", type: "storage" }, prev[prev.length - 1]]);
    };

    const removeStop = (index: number) => {
        if (stops.length <= 2) return;
        setStops(prev => prev.filter((_, i) => i !== index));
    };

    const canProceedLogistics = stops.every(s => s.address.trim()) && stops.length >= 2 && date;

    const handleToReview = async () => {
        setIsCalculating(true);
        try {
            const addresses = stops.map(s => s.address);
            const { totalMiles } = await calculateRouteDistance(addresses, calculateDistance);
            const classification = classifyJobType(firstPickup, lastDropoff);
            const breakdown = calculateAIQuote(rooms, totalMiles, classification);
            setQuoteBreakdown(breakdown);
        } catch (e) {
            console.error("Failed to calculate route/quote", e);
            // Fallback: calculate without distance
            const classification = classifyJobType(firstPickup, lastDropoff);
            const breakdown = calculateAIQuote(rooms, 0, classification);
            setQuoteBreakdown(breakdown);
        } finally {
            setIsCalculating(false);
            setStep("review");
        }
    };

    const handleBook = async () => {
        if (!date) {
            toast.error("Please select a moving date.");
            return;
        }
        setIsSubmitting(true);
        try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            const quote = await QuoteORM.getInstance().insertQuote({
                pickup_address: firstPickup,
                dropoff_address: lastDropoff,
                move_date: date.toISOString(),
                inventory_items: rooms,
                estimated_volume: totalItems * 5,
                estimated_price_min: quoteBreakdown ? Math.round(quoteBreakdown.totalEstimate * 0.85) : 450,
                estimated_price_max: quoteBreakdown ? Math.round(quoteBreakdown.totalEstimate * 1.15) : 600,
                customer_name: contactName,
                customer_email: contactEmail,
                customer_phone: contactPhone,
                company_id: "",
                status: "PENDING",
                stops: stops.map(s => ({ address: s.address, type: s.type })),
                quote_breakdown: quoteBreakdown || undefined,
                expires_at: expiresAt.toISOString(),
            });
            setSubmittedQuoteId(quote.id);
            setStep("success");
        } catch (error) {
            console.error("Failed to submit quote:", error);
            toast.error("Failed to submit quote. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b py-4">
                <div className="container mx-auto px-4 flex justify-between items-center">
                    <div className="font-bold text-xl text-primary flex items-center gap-2">
                        <Truck className="h-6 w-6" />
                        Swift Movers
                    </div>
                    <Link to="/login">
                        <Button variant="ghost">Login</Button>
                    </Link>
                </div>
            </header>

            {/* Wizard Content */}
            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                {/* Progress Bar */}
                <div className="mb-8 max-w-3xl mx-auto">
                    <div className="flex justify-between text-sm font-medium mb-2 text-muted-foreground">
                        <span className={cn(step === "logistics" || step === "inventory" || step === "review" ? "text-primary" : "")}>1. Logistics</span>
                        <span className={cn(step === "inventory" || step === "review" ? "text-primary" : "")}>2. Inventory</span>
                        <span className={cn(step === "review" ? "text-primary" : "")}>3. Review & Book</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-300 ease-in-out"
                            style={{
                                width: step === "logistics" ? "33%" :
                                    step === "inventory" ? "66%" :
                                        step === "review" ? "90%" : "100%"
                            }}
                        />
                    </div>
                </div>

                {step === "logistics" && (
                    <Card className="max-w-3xl mx-auto">
                        <CardHeader>
                            <CardTitle>Where are you moving?</CardTitle>
                            <CardDescription>Enter your stops and select a date.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {stops.map((stop, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Label className="text-sm font-medium">
                                                Stop {index + 1}
                                            </Label>
                                            <Select
                                                value={stop.type}
                                                onValueChange={(val) => updateStop(index, { type: val as StopEntry["type"] })}
                                            >
                                                <SelectTrigger className="w-32 h-7 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pickup">Pickup</SelectItem>
                                                    <SelectItem value="dropoff">Dropoff</SelectItem>
                                                    <SelectItem value="storage">Storage</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <AddressAutocomplete
                                            id={`stop-${index}`}
                                            placeholder={`${stop.type === "pickup" ? "Pickup" : stop.type === "dropoff" ? "Dropoff" : "Storage"} address`}
                                            value={stop.address}
                                            onChange={(val) => updateStop(index, { address: val })}
                                        />
                                    </div>
                                    {stops.length > 2 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="mt-7 text-red-500 hover:text-red-700"
                                            onClick={() => removeStop(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}

                            <Button variant="outline" size="sm" onClick={addStop} className="w-full">
                                <Plus className="h-4 w-4 mr-1" /> Add Stop
                            </Button>

                            <div className="space-y-2 flex flex-col">
                                <Label>Move Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end">
                            <Button onClick={() => setStep("inventory")} disabled={!canProceedLogistics}>
                                Next Step <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {step === "inventory" && (
                    <div className="space-y-6">
                        <RoomInventoryManager
                            initialRooms={rooms}
                            onInventoryChange={setRooms}
                        />

                        <div className="flex justify-between bg-white p-4 rounded-lg border shadow-sm sticky bottom-4">
                            <Button variant="outline" onClick={() => setStep("logistics")}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                            <div className="flex items-center gap-4">
                                <div className="text-sm text-muted-foreground hidden sm:block">
                                    Total Items: <strong>{totalItems}</strong>
                                </div>
                                <Button onClick={handleToReview} disabled={isCalculating}>
                                    {isCalculating ? "Calculating..." : "Next Step"}
                                    {!isCalculating && <ArrowRight className="ml-2 h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {step === "review" && (
                    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        <Card className="h-fit">
                            <CardHeader>
                                <CardTitle>Review Your Quote</CardTitle>
                                <CardDescription>AI-calculated estimate based on your inventory and route.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                                    {/* Show all stops */}
                                    {stops.map((stop, i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-muted-foreground capitalize">
                                                Stop {i + 1} ({stop.type})
                                            </span>
                                            <span className="font-medium text-right max-w-[200px] truncate">{stop.address}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Date</span>
                                        <span className="font-medium">{date ? format(date, "PPP") : ""}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Items</span>
                                        <span className="font-medium">{totalItems}</span>
                                    </div>
                                    {quoteBreakdown && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Route Distance</span>
                                            <span className="font-medium">{quoteBreakdown.details.distanceMiles} mi</span>
                                        </div>
                                    )}
                                    <Separator />

                                    {/* Dynamic AI pricing breakdown */}
                                    {quoteBreakdown ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                                <Sparkles className="h-4 w-4" />
                                                AI-Powered Quote
                                            </div>
                                            <div className="grid gap-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Labor ({quoteBreakdown.details.estimatedHours}h)</span>
                                                    <span className="font-medium">${quoteBreakdown.laborCost}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Fuel</span>
                                                    <span className="font-medium">${quoteBreakdown.fuelCost}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Materials</span>
                                                    <span className="font-medium">${quoteBreakdown.materialsCost}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Insurance</span>
                                                    <span className="font-medium">${quoteBreakdown.insuranceCost}</span>
                                                </div>
                                            </div>
                                            <div className="pt-2">
                                                <div className="text-sm font-medium mb-1">Estimated Price Range</div>
                                                <div className="text-3xl font-bold text-primary">
                                                    ${Math.round(quoteBreakdown.totalEstimate * 0.85)} - ${Math.round(quoteBreakdown.totalEstimate * 1.15)}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">Final price subject to on-site verification</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="pt-2">
                                            <div className="text-sm font-medium mb-1">Estimated Price Range</div>
                                            <div className="text-3xl font-bold text-primary">$450 - $600</div>
                                            <div className="text-xs text-muted-foreground mt-1">Final price subject to verification</div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Finalize Request</CardTitle>
                                <CardDescription>Enter your contact details to receive this quote and book.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="name"
                                            placeholder="John Doe"
                                            className="pl-9"
                                            value={contactName}
                                            onChange={(e) => setContactName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="john@example.com"
                                            className="pl-9"
                                            value={contactEmail}
                                            onChange={(e) => setContactEmail(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="(555) 123-4567"
                                            className="pl-9"
                                            value={contactPhone}
                                            onChange={(e) => setContactPhone(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button
                                        size="lg"
                                        className="w-full"
                                        onClick={handleBook}
                                        disabled={isSubmitting || !contactName || !contactEmail || !contactPhone}
                                    >
                                        {isSubmitting ? "Submitting..." : "Send Request & Book"}
                                    </Button>
                                    <p className="text-xs text-muted-foreground text-center mt-2">
                                        By clicking, you agree to our Terms of Service.
                                    </p>
                                </div>
                            </CardContent>
                            <CardFooter className="justify-center border-t pt-4">
                                <Button variant="ghost" size="sm" onClick={() => setStep("inventory")}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {step === "success" && (
                    <Card className="text-center py-10 max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold text-green-600 flex items-center justify-center gap-2">
                                <CheckCircle2 className="h-8 w-8" />
                                Booking Request Received!
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                Thank you, <strong>{contactName}</strong>. We have received your request. <br />
                                Your reference ID is <strong>#{submittedQuoteId.slice(0, 8).toUpperCase()}</strong>.
                            </p>
                            <div className="bg-blue-50 p-4 rounded-lg text-blue-800 text-sm">
                                <strong>Next Step:</strong> Please create an account to track your move status and complete payment.
                            </div>
                            <Link
                                to="/login"
                                search={{
                                    tab: "signup",
                                    role: "customer",
                                    quoteId: submittedQuoteId
                                }}
                            >
                                <Button size="lg" className="w-full sm:w-auto">
                                    Create Account & Track Move
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
