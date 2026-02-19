import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCreaoAuth } from "@/sdk/core/auth";
import { JobORM, JobStatus } from "@/sdk/database/orm/orm_job";

interface LiveTrackingMapProps {
    height?: string;
}

const STATUS_LABEL: Partial<Record<JobStatus, string>> = {
    [JobStatus.EnRoute]: "En Route",
    [JobStatus.Arrived]: "Arrived",
    [JobStatus.Loading]: "Loading",
    [JobStatus.onWayToDropoff]: "In Transit",
    [JobStatus.Unloading]: "Unloading",
};

const STATUS_COLOR: Partial<Record<JobStatus, string>> = {
    [JobStatus.EnRoute]: "bg-blue-500",
    [JobStatus.Arrived]: "bg-yellow-500",
    [JobStatus.Loading]: "bg-orange-500",
    [JobStatus.onWayToDropoff]: "bg-purple-500",
    [JobStatus.Unloading]: "bg-green-500",
};

const ACTIVE_STATUSES = new Set([
    JobStatus.EnRoute,
    JobStatus.Arrived,
    JobStatus.Loading,
    JobStatus.onWayToDropoff,
    JobStatus.Unloading,
]);

export function LiveTrackingMap({ height = "500px" }: LiveTrackingMapProps) {
    const { companyId } = useCreaoAuth();

    const { data: activeJobs = [] } = useQuery({
        queryKey: ["active-jobs-tracking", companyId],
        enabled: !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            const all = await JobORM.getInstance().getJobsByCompanyId(companyId);
            return all.filter((j) => ACTIVE_STATUSES.has(j.status));
        },
        refetchInterval: 30000,
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Fleet Tracking</h2>
                    <p className="text-muted-foreground">Live view of active jobs and vehicle locations</p>
                </div>
                <Badge variant="outline" className="gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500 inline-block animate-pulse" />
                    Live
                </Badge>
            </div>

            {/* Map area */}
            <Card>
                <CardContent className="p-0 overflow-hidden rounded-lg">
                    <div
                        className="bg-muted flex items-center justify-center"
                        style={{ height }}
                        data-testid="fleet-tracking-map"
                    >
                        <div className="text-center text-muted-foreground space-y-2">
                            <MapPin className="h-12 w-12 mx-auto opacity-30" />
                            <p className="text-sm">
                                Live GPS tracking requires Google Maps integration.
                            </p>
                            <p className="text-xs">
                                {activeJobs.length} active job{activeJobs.length !== 1 ? "s" : ""} in progress
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Active jobs list */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Active Jobs ({activeJobs.length})
                </h3>
                {activeJobs.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No active jobs in progress.</p>
                        </CardContent>
                    </Card>
                ) : (
                    activeJobs.map((job) => (
                        <Card key={job.id}>
                            <CardContent className="py-3 flex items-center gap-3">
                                <Truck className="h-5 w-5 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{job.customer_name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {job.pickup_address} → {job.dropoff_address}
                                    </p>
                                </div>
                                <Badge
                                    className={`text-white text-xs ${STATUS_COLOR[job.status] ?? "bg-gray-500"}`}
                                >
                                    {STATUS_LABEL[job.status] ?? "Active"}
                                </Badge>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
