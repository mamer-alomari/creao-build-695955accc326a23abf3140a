
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useCreaoAuth, UserRole } from "@/sdk/core/auth";
import { useEffect } from "react";

export const Route = createFileRoute("/team")({
    component: TeamLayout,
});

function TeamLayout() {
    // Just a placeholder layout, auth guard is in _authenticated likely, or we add here
    const { role, isAuthenticated, isLoading } = useCreaoAuth();

    // Simple Guard
    if (!isLoading && (!isAuthenticated || (role !== UserRole.Manager && role !== UserRole.Admin))) {
        return <div>Access Denied. Managers only.</div>;
    }

    return (
        <div className="container py-8">
            <Outlet />
        </div>
    );
}
