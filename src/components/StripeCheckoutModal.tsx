import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface StripeCheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    amount: number;
    description: string;
}

export function StripeCheckoutModal({ isOpen, onClose, onSuccess, amount, description }: StripeCheckoutModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Mock form state
    const [name, setName] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvc, setCvc] = useState("");

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!name || cardNumber.length < 15 || !expiry || !cvc) {
            toast.error("Please fill in all card details correctly.");
            return;
        }

        setIsProcessing(true);

        // Simulate network delay for Stripe processing
        setTimeout(() => {
            setIsProcessing(false);
            setIsSuccess(true);

            // Show success briefly before closing and triggering callback
            setTimeout(() => {
                setIsSuccess(false);
                onClose();
                onSuccess();
            }, 1500);
        }, 2000);
    };

    // Reset state when opened/closed
    const handleOpenChange = (open: boolean) => {
        if (!open && isProcessing) return; // Prevent closing while processing

        if (!open) {
            // Reset state on close
            setTimeout(() => {
                setIsSuccess(false);
                setName("");
                setCardNumber("");
                setExpiry("");
                setCvc("");
            }, 300);
        }

        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                {!isSuccess ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-indigo-600" />
                                Secure Checkout
                            </DialogTitle>
                            <DialogDescription>
                                Complete your payment for {description}.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="bg-slate-50 p-4 rounded-lg my-4 border border-slate-100 flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-500">Total to pay</span>
                            <span className="text-2xl font-bold">${amount.toFixed(2)}</span>
                        </div>

                        <form onSubmit={handleCheckout} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name on Card</Label>
                                <Input
                                    id="name"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isProcessing}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="card">Card Number</Label>
                                <Input
                                    id="card"
                                    placeholder="4242 4242 4242 4242"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(e.target.value)}
                                    maxLength={19}
                                    disabled={isProcessing}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="expiry">Expiry Date</Label>
                                    <Input
                                        id="expiry"
                                        placeholder="MM/YY"
                                        value={expiry}
                                        onChange={(e) => setExpiry(e.target.value)}
                                        maxLength={5}
                                        disabled={isProcessing}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cvc">CVC</Label>
                                    <Input
                                        id="cvc"
                                        placeholder="123"
                                        value={cvc}
                                        onChange={(e) => setCvc(e.target.value)}
                                        maxLength={4}
                                        disabled={isProcessing}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg"
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Processing Payment...
                                        </>
                                    ) : (
                                        `Pay $${amount.toFixed(2)}`
                                    )}
                                </Button>
                                <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
                                    <span className="inline-block w-3 h-3 bg-indigo-600 rounded-full opacity-50"></span>
                                    Powered by Stripe (Mockup Mode)
                                </p>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                            <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Payment Successful!</h2>
                        <p className="text-slate-500">Your transaction has been processed.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
