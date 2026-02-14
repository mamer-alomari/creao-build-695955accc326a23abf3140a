
import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useCreaoAuth, UserRole } from "@/sdk/core/auth";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { LogOut, MapPin, Truck } from "lucide-react";
import { useWorkerLocationTracker } from "@/hooks/use-worker-location";

export const Route = createFileRoute("/worker")({
    component: WorkerLayout,
});

function WorkerLayout() {
    const { role, isAuthenticated, isLoading, logout } = useCreaoAuth();
    const navigate = useNavigate();

    // Start Background Tracking when viewing the Worker App
    useWorkerLocationTracker();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                navigate({ to: "/login" });
            } else if (role !== UserRole.Worker && role !== UserRole.Manager && role !== UserRole.Admin) {
                // Redirect customers/unspecified away
                navigate({ to: "/" });
            }
        }
    }, [isLoading, isAuthenticated, role, navigate]);

    if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-100 pb-20">
            {/* Worker Header - Mobile Optimized */}
            <header className="bg-slate-900 text-white sticky top-0 z-10 shadow-md">
                <div className="container mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <Truck className="h-5 w-5 text-yellow-400" />
                        <span>Field Ops</span>
                    </div>
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => logout()} className="text-slate-300 hover:text-white">
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-4">
                <Outlet />
            </main>

            {/* Bottom Nav (Mobile) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t h-16 flex items-center justify-around z-20 pb-safe">
                <Link
                    to="/worker"
                    activeProps={{ className: "text-primary" }}
                    className="flex flex-col items-center justify-center w-full h-full text-muted-foreground"
                >
                    <Truck className="h-6 w-6 mb-1" />
                    <span className="text-xs font-medium">My Jobs</span>
                </Link>
                {/* Removed Profile/Map Link as route does not exist yet */}
            </nav>
        </div>
    );
}
