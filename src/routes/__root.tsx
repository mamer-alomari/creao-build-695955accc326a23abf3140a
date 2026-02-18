import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { useCreaoAuth } from "@/sdk/core/auth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { DebugRoleSwitcher } from "@/components/DebugRoleSwitcher";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRoute({
	component: Root,
});

function Root() {
	const { isAuthenticated, isLoading, clearAuth, status } = useCreaoAuth();

	const handleLogout = async () => {
		await clearAuth();
		window.location.reload();
	};

	return (
		<div className="flex flex-col min-h-screen">
			{/* Header with logout button */}
			<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container flex h-14 items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="font-semibold">ABADAI</span>
					</div>
					<div className="flex items-center gap-4">
						<DebugRoleSwitcher />
						{isLoading ? (
							<span className="text-sm text-muted-foreground">Loading...</span>
						) : isAuthenticated ? (
							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground flex items-center gap-1">
									<User className="h-4 w-4" />
									Authenticated
								</span>
								<Button
									variant="outline"
									size="sm"
									onClick={handleLogout}
									className="gap-2"
								>
									<LogOut className="h-4 w-4" />
									Logout
								</Button>
							</div>
						) : (
							<span className="text-sm text-muted-foreground">
								Status: {status}
							</span>
						)}
					</div>
				</div>
			</header>
			<ErrorBoundary tagName="main" className="flex-1">
				<Outlet />
			</ErrorBoundary>
			<TanStackRouterDevtools position="bottom-right" />
			<Toaster />

		</div>
	);
}
