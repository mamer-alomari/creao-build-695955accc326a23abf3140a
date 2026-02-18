import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCreaoAuth, UserRole } from "@/sdk/core/auth";
import { Bug, UserCog } from "lucide-react";
import { toast } from "sonner";

import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function DebugRoleSwitcher() {
    const { role, setRole, user, setUser, setStatus } = useCreaoAuth();

    if (!user) {
        return (
            <Button
                variant="outline"
                size="sm"
                className="gap-2 border-dashed border-red-500 text-red-600"
                onClick={() => {
                    setUser({
                        uid: "debug-user-123",
                        email: "debug@example.com",
                        displayName: "Debug User",
                    } as any);
                    setRole(UserRole.Foreman);
                    setStatus("authenticated");
                    toast.success("Logged in as Debug User");
                }}
            >
                <Bug className="h-4 w-4" />
                Debug Login
            </Button>
        )
    }

    const handleRoleChange = async (newRole: UserRole) => {
        // Optimistic update
        setRole(newRole);

        if (user?.uid) {
            try {
                // Determine if this is a real user or a debug fake user
                // Real users have a UID that is likely not "debug-user-123" 
                // (though a real check would be checking auth.currentUser)

                // We'll attempt to update Firestore. If it fails (e.g. because it's a fake user 
                // who isn't actually auth'd in Firebase), we'll catch it.
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, { role: newRole });
                toast.success(`Switched role to ${newRole} (synced)`, {
                    description: "Reload page to apply permission changes.",
                    action: {
                        label: "Reload Now",
                        onClick: () => window.location.reload(),
                    },
                });
            } catch (error) {
                console.warn("Failed to sync role to Firestore (likely debug user):", error);
                toast.success(`Switched role to ${newRole} (local only)`);
            }
        } else {
            toast.success(`Switched role to ${newRole}`);
        }
    };

    const handleRunDiagnostics = async () => {
        if (!user?.uid) return;

        try {
            const userRef = doc(db, "users", user.uid);
            const snap = await import("firebase/firestore").then(m => m.getDoc(userRef));

            if (snap.exists()) {
                const data = snap.data();
                console.log("Firestore User Data:", data);
                alert(`
                   User ID: ${user.uid}
                   Firestore Role: ${data.role}
                   Firestore CompanyId: ${data.companyId}
                   Client Role: ${role}
                   
                   If CompanyId is missing or wrong, you cannot create workers.
               `);

                // Auto-Repair attempts
                if (!data.companyId && role !== UserRole.Unspecified) {
                    const companyName = "Acme Moving"; // Default fallback
                    // Try to find company
                    const companies = await import("@/sdk/database/orm/orm_company").then(m => m.CompanyORM.getInstance().getCompanyByName(companyName));

                    if (companies.length > 0) {
                        const targetCompany = companies[0];
                        if (confirm(`Missing CompanyID. Found '${targetCompany.name}' (${targetCompany.id}). Link to this company?`)) {
                            await updateDoc(userRef, { companyId: targetCompany.id });
                            toast.success("Repaired Company Link!");
                            window.location.reload();
                        }
                    }
                }
            } else {
                alert("User document does not exist in Firestore!");
                // Create it?
            }
        } catch (e: any) {
            console.error(e);
            alert("Diagnostics failed: " + e.message);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-dashed border-yellow-500 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50">
                    <Bug className="h-4 w-4" />
                    <span className="hidden sm:inline">Debug: {role}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Debug: Switch Role</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.values(UserRole).map((r) => (
                    <DropdownMenuItem
                        key={r}
                        onClick={() => handleRoleChange(r)}
                        className={role === r ? "bg-accent" : ""}
                    >
                        <UserCog className="h-4 w-4 mr-2" />
                        {r}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleRunDiagnostics} className="text-blue-600">
                    <Bug className="h-4 w-4 mr-2" />
                    Run Auth Diagnostics
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
