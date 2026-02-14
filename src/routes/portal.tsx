
import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useCreaoAuth, UserRole } from "@/sdk/core/auth";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { LogOut, Home, Package } from "lucide-react";

export const Route = createFileRoute("/portal")({
    component: PortalLayout,
});

function PortalLayout() {
    const { role, isAuthenticated, isLoading, logout } = useCreaoAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                navigate({ to: "/login" });
            } else if (role !== UserRole.Customer && role !== UserRole.Unspecified) {
                // Prevent workers/managers from accidental portal view, unless we want to allow it.
                // For now, let's just allow access but mostly this is for customers.
                // If role is strictly checked:
                // navigate({ to: "/" });
            }
        }
    }, [isLoading, isAuthenticated, role, navigate]);

    if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Portal Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link to="/portal" className="font-bold text-xl text-primary">Swift Movers Portal</Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => logout()}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <Outlet />
            </main>
        </div>
    );
}
