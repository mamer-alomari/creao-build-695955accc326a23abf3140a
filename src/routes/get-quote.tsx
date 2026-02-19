import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, ArrowLeft, Truck, Calendar as CalendarIcon, MapPin, CheckCircle2, User, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { RoomInventoryManager } from "@/components/room-inventory";
import { type RoomInventory } from "@/hooks/use-google-vision";
import { QuoteORM } from "@/sdk/database/orm/orm_quote";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { classifyJobType } from "@/lib/address-utils";


export const Route = createFileRoute("/get-quote")({
    component: GetQuoteView,
});

type QuoteStep = "logistics" | "inventory" | "review" | "success";

export function GetQuoteView() {
    const [step, setStep] = useState<QuoteStep>("logistics");
    // Form State
    const [pickup, setPickup] = useState("");
    const [dropoff, setDropoff] = useState("");
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

    const totalItems = rooms.reduce((acc, room) => acc + room.items.filter(i => i.quantity > 0).length, 0);
    const estimatedVolume = totalItems * 5; // Rough estimate (cubic feet)

    const handleBook = async () => {
        if (!date) {
            toast.error("Please select a moving date.");
            return;
        }
        setIsSubmitting(true);
        try {
            const classification = classifyJobType(pickup, dropoff);
            const quote = await QuoteORM.getInstance().insertQuote({
                pickup_address: pickup,
                dropoff_address: dropoff,
                move_date: date.toISOString(),
                inventory_items: rooms,
                estimated_volume: estimatedVolume,
                estimated_price_min: 450, // Logic should be dynamic
                estimated_price_max: 600,
                customer_name: contactName,
                customer_email: contactEmail,
                customer_phone: contactPhone,
                company_id: "", // Sent to pure open pool initially
                status: "PENDING"
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
                            <CardDescription>Enter your pickup and dropoff locations and select a date.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="pickup">Pickup Address</Label>
                                <div className="relative">
                                    <AddressAutocomplete
                                        id="pickup"
                                        placeholder="123 Main St, City, State"
                                        value={pickup}
                                        onChange={setPickup}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dropoff">Dropoff Address</Label>
                                <div className="relative">
                                    <AddressAutocomplete
                                        id="dropoff"
                                        placeholder="456 New Home Ave, City, State"
                                        value={dropoff}
                                        onChange={setDropoff}
                                    />
                                </div>
                            </div>
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
                            <Button onClick={() => setStep("inventory")} disabled={!pickup || !dropoff || !date}>
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
                                <Button onClick={() => setStep("review")}>
                                    Next Step <ArrowRight className="ml-2 h-4 w-4" />
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
                                <CardDescription>Estimated move based on details provided.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">From</span>
                                        <span className="font-medium text-right">{pickup}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">To</span>
                                        <span className="font-medium text-right">{dropoff}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Date</span>
                                        <span className="font-medium">{date ? format(date, "PPP") : ""}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Items</span>
                                        <span className="font-medium">{totalItems}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Est. Volume</span>
                                        <span className="font-medium">~{estimatedVolume} cu. ft.</span>
                                    </div>
                                    <Separator />
                                    <div className="pt-2">
                                        <div className="text-sm font-medium mb-1">Estimated Price Range</div>
                                        <div className="text-3xl font-bold text-primary">$450 - $600</div>
                                        <div className="text-xs text-muted-foreground mt-1">Final price subject to verification</div>
                                    </div>
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
