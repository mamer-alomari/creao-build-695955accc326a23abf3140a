
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { InvitationORM, type InvitationModel } from "@/sdk/database/orm/orm_invitation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2 } from "lucide-react";

// Use Search Params to get token
interface InviteSearch {
    token: string;
}

export const Route = createFileRoute("/invite")({
    component: InviteView,
    validateSearch: (search: Record<string, unknown>): InviteSearch => {
        return { token: (search.token as string) || "" };
    },
});

function InviteView() {
    const { token } = useSearch({ from: "/invite" });
    const navigate = useNavigate();

    const [invitation, setInvitation] = useState<InvitationModel | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function checkToken() {
            if (!token) {
                setError("Invalid invitation link.");
                setIsLoading(false);
                return;
            }

            try {
                const invite = await InvitationORM.getInstance().getInvitationByToken(token);
                if (!invite) {
                    setError("Invitation not found. It may have expired or been revoked.");
                } else if (invite.status === "accepted") {
                    setError("This invitation has already been used.");
                } else if (new Date(invite.expires_at) < new Date()) {
                    setError("This invitation has expired.");
                } else {
                    setInvitation(invite);
                    if (invite.name) setName(invite.name);
                    if (invite.phone_number) setPhone(invite.phone_number);
                }
            } catch (err) {
                console.error(err);
                setError("Failed to verify invitation.");
            } finally {
                setIsLoading(false);
            }
        }
        checkToken();
    }, [token]);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (!invitation) return;

        setIsSubmitting(true);
        try {
            // 1. Create Auth User
            const userCred = await createUserWithEmailAndPassword(auth, invitation.email, password);

            // 2. Create User Profile with Role & Company
            await setDoc(doc(db, "users", userCred.user.uid), {
                email: invitation.email,
                full_name: name, // User might have edited it
                phone_number: phone,
                role: invitation.role,
                companyId: invitation.company_id,
                createdAt: new Date().toISOString()
            });

            // 3. Mark Invitation as Accepted
            await InvitationORM.getInstance().acceptInvitation(token);

            // 4. Redirect based on role
            if (invitation.role === "worker") {
                navigate({ to: "/worker" });
            } else {
                navigate({ to: "/" });
            }

        } catch (err: any) {
            console.error(err);
            toast.error("Signup failed: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-red-600">
                        <CardTitle>Invitation Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{error}</p>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" onClick={() => navigate({ to: "/login" })}>Go to Login</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Join Swift Movers</CardTitle>
                    <CardDescription>
                        You have been invited to join as a <strong>{invitation?.role.toUpperCase()}</strong>.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={invitation?.email} disabled className="bg-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your Full Name" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="(555) 123-4567" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Set Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm">Confirm Password</Label>
                            <Input
                                id="confirm"
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Create Account
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
