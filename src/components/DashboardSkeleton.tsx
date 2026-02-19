import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
    return (
        <div className="flex min-h-[calc(100vh-3.5rem)]">
            {/* Sidebar skeleton */}
            <aside className="w-64 border-r bg-muted/30 p-4 shrink-0 space-y-3">
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-32 mb-6" />
                {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                ))}
            </aside>

            {/* Main content skeleton */}
            <main className="flex-1 p-6 space-y-6">
                <div className="grid grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-lg border p-4 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                    ))}
                </div>
                <Skeleton className="h-64 w-full rounded-lg" />
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-48 rounded-lg" />
                    <Skeleton className="h-48 rounded-lg" />
                </div>
            </main>
        </div>
    );
}
