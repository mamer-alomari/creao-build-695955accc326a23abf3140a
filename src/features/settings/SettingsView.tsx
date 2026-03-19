import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type CompanyModel, CompanyORM } from "@/sdk/database/orm/orm_company";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreaoAuth } from "@/sdk/core/auth";
import { ApiKeysSection } from "./ApiKeysSection";

export function SettingsView({ company }: { company: CompanyModel | null }) {
    const { companyId } = useCreaoAuth();
    const queryClient = useQueryClient();
    const [isConnecting, setIsConnecting] = useState(false);

    // Mock mutation for connecting Stripe
    const connectStripeMutation = useMutation({
        mutationFn: async () => {
            if (!companyId) throw new Error("No company found");
            setIsConnecting(true);

            // In a real implementation:
            // 1. Call Firebase Function `createStripeAccountLink({ companyId })`
            // 2. Window.location.href = response.data.url

            // MOCK IMPLEMENTATION:
            await new Promise(resolve => setTimeout(resolve, 2000));
            const orm = CompanyORM.getInstance();
            await orm.setCompanyById(companyId, {
                ...company!,
                stripe_account_id: "acct_mock_" + Date.now(),
                stripe_onboarding_complete: true
            });

            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["company", companyId] });
            toast.success("Stripe Account Successfully Connected! (Mocked)");
        },
        onError: (err) => {
            toast.error("Failed to connect Stripe: " + err.message);
        },
        onSettled: () => {
            setIsConnecting(false);
        }
    });

    if (!company) {
        return <div className="p-8 text-center text-muted-foreground">Loading Company Settings...</div>;
    }

    const isStripeConnected = company.stripe_onboarding_complete && company.stripe_account_id;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Company Settings</h2>
                <p className="text-muted-foreground">Manage your company profile and external integrations.</p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Company Profile
                        </CardTitle>
                        <CardDescription>Basic information about your moving company.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Company Name</div>
                                <div className="text-base">{company.name}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Contact Email</div>
                                <div className="text-base">{company.contact_email}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">License Number</div>
                                <div className="text-base">{company.license_number || "Not provided"}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Payment Integrations
                        </CardTitle>
                        <CardDescription>Connect Stripe to receive payments directly from customers.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-slate-50">
                            <div className="space-y-1 mb-4 sm:mb-0">
                                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                    Stripe Connect
                                    {isStripeConnected && (
                                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                            Active
                                        </span>
                                    )}
                                </h4>
                                <p className="text-sm text-slate-500 max-w-md">
                                    {isStripeConnected
                                        ? `Connected Account ID: ${company.stripe_account_id}`
                                        : "Link your bank account to securely accept credit card payments using Stripe Express."}
                                </p>
                            </div>

                            <div>
                                {isStripeConnected ? (
                                    <Button variant="outline" className="text-slate-600 bg-white" onClick={() => toast.info("Stripe Dashboard redirect would happen here.")}>
                                        View Dashboard <ExternalLink className="ml-2 h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => connectStripeMutation.mutate()}
                                        disabled={isConnecting}
                                        className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto"
                                    >
                                        {isConnecting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Connecting...
                                            </>
                                        ) : (
                                            "Connect Stripe Account"
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <ApiKeysSection />
            </div>
        </div>
    );
}
