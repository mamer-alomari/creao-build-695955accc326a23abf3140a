import { useState } from "react";
import { useCreaoAuth, UserRole } from "@/sdk/core/auth";
import { CompanyORM, type CompanyModel } from "@/sdk/database/orm/orm_company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function OnboardingView() {
    const { user, setCompanyId, setRole } = useCreaoAuth();
    const navigate = useNavigate();
    const [companyName, setCompanyName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsLoading(true);
        setError(null);

        try {
            const companyOrm = CompanyORM.getInstance();

            // 1. Create Company
            const newCompanies = await companyOrm.insertCompany([{
                name: companyName,
                contact_email: user.email || "",
                // IDs and timestamps are handled by ORM
            } as any]); // Cast to any to bypass strict checks if ORM types are partial

            if (newCompanies.length === 0) throw new Error("Failed to create company");
            const newCompany = newCompanies[0];

            // 2. Update User Profile
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                companyId: newCompany.id,
                role: UserRole.Manager // Creator becomes Manager
            });

            // 3. Update Local State
            setCompanyId(newCompany.id);
            setRole(UserRole.Manager);

            // 4. Redirect
            navigate({ to: "/" });
        } catch (err: any) {
            console.error("Onboarding error:", err);
            setError(err.message || "Failed to create company");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <Card className="w-[450px]">
                <CardHeader>
                    <CardTitle>Welcome to Swift Movers CRM</CardTitle>
                    <CardDescription>Let's set up your moving company workspace.</CardDescription>
                </CardHeader>
                <form onSubmit={handleCreateCompany}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input
                                id="companyName"
                                placeholder="e.g. Acme Moving Co."
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                                minLength={3}
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isLoading || !companyName}>
                            {isLoading ? "Creating Workspace..." : "Create Workspace"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
