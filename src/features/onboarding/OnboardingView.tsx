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
import { validateCompanyName } from "../../lib/schemas";

export function OnboardingView() {
    const { user, setCompanyId, setRole } = useCreaoAuth();
    const navigate = useNavigate();
    const [companyName, setCompanyName] = useState("Acme Moving");
    const [warehouseLocations, setWarehouseLocations] = useState<string[]>([""]);
    const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.Manager);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsLoading(true);
        setError(null);

        try {
            const companyOrm = CompanyORM.getInstance();

            // Validate company name with Zod
            const validatedName = validateCompanyName(companyName);

            // 1. Check if Company Exists (Single Company Test Mode)
            const existingCompanies = await companyOrm.getCompanyByName(validatedName);
            let newCompany: CompanyModel;

            if (existingCompanies.length > 0) {
                // JOIN existing company
                console.log("Joining existing company:", existingCompanies[0].name);
                newCompany = existingCompanies[0];
            } else {
                // CREATE new company
                const newCompanies = await companyOrm.insertCompany([{
                    name: validatedName,
                    contact_email: user.email || "",
                    warehouse_locations: warehouseLocations.filter(l => l.trim() !== ""),
                    // IDs and timestamps are handled by ORM
                } as any]);

                if (newCompanies.length === 0) throw new Error("Failed to create company");
                newCompany = newCompanies[0];
            }

            // 2. Update User Profile
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                companyId: newCompany.id,
                role: selectedRole // User selected role
            });

            // 3. Update Local State
            setCompanyId(newCompany.id);
            setRole(selectedRole);

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
                <form onSubmit={handleCreateCompany}>
                    <CardHeader className="text-center">
                        <CardTitle>Welcome to ABADAI</CardTitle>
                        <CardDescription>Let's set up your moving company workspace.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-primary-foreground/80">
                            Join thousands of moving companies using ABADAI to streamline their operations.
                        </div>
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
                        <div className="space-y-2">
                            <Label>Warehouse Locations</Label>
                            {warehouseLocations.map((location, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        placeholder="e.g. 123 Warehouse St, City, State"
                                        value={location}
                                        onChange={(e) => {
                                            const newLocations = [...warehouseLocations];
                                            newLocations[index] = e.target.value;
                                            setWarehouseLocations(newLocations);
                                        }}
                                    />
                                    {warehouseLocations.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                const newLocations = warehouseLocations.filter((_, i) => i !== index);
                                                setWarehouseLocations(newLocations);
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setWarehouseLocations([...warehouseLocations, ""])}
                                className="w-full"
                            >
                                + Add Another Location
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <Label>Your Role (for testing)</Label>
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                            >
                                <option value={UserRole.Manager}>Manager (Full Access)</option>
                                <option value={UserRole.Foreman}>Foreman (Field App)</option>
                                <option value={UserRole.Worker}>Worker (Limited View)</option>
                            </select>
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
