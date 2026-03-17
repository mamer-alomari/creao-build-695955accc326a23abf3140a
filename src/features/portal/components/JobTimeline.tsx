import { JobStatus, type JobStop } from "@/sdk/database/orm/orm_job";
import { CheckCircle2, Circle, Truck, MapPin, Package, Navigation, Home, Warehouse } from "lucide-react";

interface JobTimelineProps {
    currentStatus: JobStatus;
    stops?: JobStop[];
}

const TIMELINE_STEPS = [
    { status: JobStatus.Quote, label: "Quote", icon: Circle, description: "Quote received" },
    { status: JobStatus.Booked, label: "Booked", icon: CheckCircle2, description: "Move confirmed" },
    { status: JobStatus.EnRoute, label: "En Route", icon: Navigation, description: "Team driving to pickup" },
    { status: JobStatus.Arrived, label: "Arrived", icon: MapPin, description: "Team at pickup location" },
    { status: JobStatus.Loading, label: "Loading", icon: Package, description: "Loading your belongings" },
    { status: JobStatus.onWayToDropoff, label: "In Transit", icon: Truck, description: "Driving to destination" },
    { status: JobStatus.Unloading, label: "Unloading", icon: Home, description: "Unloading at destination" },
    { status: JobStatus.Completed, label: "Completed", icon: CheckCircle2, description: "Move complete!" },
];

function getStepIndex(status: JobStatus): number {
    const idx = TIMELINE_STEPS.findIndex((s) => s.status === status);
    return idx >= 0 ? idx : 0;
}

const STOP_TYPE_ICONS: Record<string, typeof MapPin> = {
    pickup: Package,
    dropoff: Home,
    storage: Warehouse,
};

const STOP_STATUS_ORDER = ["pending", "en_route", "arrived", "loading", "unloading", "completed"];

export function JobTimeline({ currentStatus, stops }: JobTimelineProps) {
    // If stops are provided, render dynamic stop-based timeline
    if (stops && stops.length > 0) {
        return <StopBasedTimeline currentStatus={currentStatus} stops={stops} />;
    }

    // Fallback: legacy hardcoded timeline
    const currentIndex = getStepIndex(currentStatus);

    return (
        <div className="space-y-2" data-testid="job-timeline">
            <p className="text-sm font-medium text-muted-foreground mb-3">Move Progress</p>
            <div className="relative">
                {TIMELINE_STEPS.map((step, index) => {
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const isPending = index > currentIndex;
                    const Icon = step.icon;

                    return (
                        <div key={step.status} className="flex items-start gap-3 pb-4 last:pb-0">
                            <div className="flex flex-col items-center">
                                <div
                                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 shrink-0 ${
                                        isCompleted
                                            ? "bg-green-500 border-green-500 text-white"
                                            : isCurrent
                                            ? "bg-primary border-primary text-white"
                                            : "bg-background border-muted-foreground/30 text-muted-foreground"
                                    }`}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        <Icon className="h-4 w-4" />
                                    )}
                                </div>
                                {index < TIMELINE_STEPS.length - 1 && (
                                    <div
                                        className={`w-0.5 h-4 mt-1 ${
                                            isCompleted ? "bg-green-500" : "bg-muted-foreground/20"
                                        }`}
                                    />
                                )}
                            </div>
                            <div className={`pt-0.5 ${isPending ? "opacity-50" : ""}`}>
                                <p
                                    className={`text-sm font-medium leading-none ${
                                        isCurrent ? "text-primary" : isCompleted ? "text-green-700" : "text-muted-foreground"
                                    }`}
                                >
                                    {step.label}
                                    {isCurrent && (
                                        <span className="ml-2 text-xs font-normal bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                            Current
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function StopBasedTimeline({ currentStatus, stops }: { currentStatus: JobStatus; stops: JobStop[] }) {
    const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);

    return (
        <div className="space-y-2" data-testid="job-timeline">
            <p className="text-sm font-medium text-muted-foreground mb-3">Route Progress</p>
            <div className="relative">
                {sortedStops.map((stop, index) => {
                    const isCompleted = stop.status === "completed";
                    const statusIdx = STOP_STATUS_ORDER.indexOf(stop.status);
                    const isActive = statusIdx > 0 && statusIdx < STOP_STATUS_ORDER.length - 1;
                    const isPending = stop.status === "pending";
                    const Icon = STOP_TYPE_ICONS[stop.type] || MapPin;

                    const subSteps = getSubStepsForStop(stop);

                    return (
                        <div key={stop.id}>
                            {/* Stop header */}
                            <div className="flex items-start gap-3 pb-2">
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 shrink-0 ${
                                            isCompleted
                                                ? "bg-green-500 border-green-500 text-white"
                                                : isActive
                                                ? "bg-primary border-primary text-white"
                                                : "bg-background border-muted-foreground/30 text-muted-foreground"
                                        }`}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <Icon className="h-4 w-4" />
                                        )}
                                    </div>
                                    {(index < sortedStops.length - 1 || subSteps.length > 0) && (
                                        <div
                                            className={`w-0.5 h-3 mt-1 ${
                                                isCompleted ? "bg-green-500" : "bg-muted-foreground/20"
                                            }`}
                                        />
                                    )}
                                </div>
                                <div className={`pt-0.5 ${isPending ? "opacity-50" : ""}`}>
                                    <p
                                        className={`text-sm font-medium leading-none ${
                                            isActive ? "text-primary" : isCompleted ? "text-green-700" : "text-muted-foreground"
                                        }`}
                                    >
                                        Stop {index + 1}: {stop.type.charAt(0).toUpperCase() + stop.type.slice(1)}
                                        {isActive && (
                                            <span className="ml-2 text-xs font-normal bg-primary/10 text-primary px-1.5 py-0.5 rounded-full capitalize">
                                                {stop.status.replace("_", " ")}
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5 max-w-[250px] truncate">
                                        {stop.address}
                                    </p>
                                </div>
                            </div>

                            {/* Sub-steps for active stop */}
                            {isActive && subSteps.length > 0 && (
                                <div className="ml-10 space-y-1 pb-2">
                                    {subSteps.map((sub, si) => (
                                        <div key={si} className="flex items-center gap-2 text-xs">
                                            <div className={`h-1.5 w-1.5 rounded-full ${sub.done ? "bg-green-500" : sub.active ? "bg-primary" : "bg-slate-300"}`} />
                                            <span className={sub.done ? "text-green-700" : sub.active ? "text-primary" : "text-muted-foreground"}>
                                                {sub.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Final completion step */}
                <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                        <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 shrink-0 ${
                                currentStatus >= JobStatus.Completed
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "bg-background border-muted-foreground/30 text-muted-foreground"
                            }`}
                        >
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                    </div>
                    <div className={`pt-0.5 ${currentStatus < JobStatus.Completed ? "opacity-50" : ""}`}>
                        <p className={`text-sm font-medium leading-none ${
                            currentStatus >= JobStatus.Completed ? "text-green-700" : "text-muted-foreground"
                        }`}>
                            Completed
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getSubStepsForStop(stop: JobStop): Array<{ label: string; done: boolean; active: boolean }> {
    const statusIdx = STOP_STATUS_ORDER.indexOf(stop.status);
    const steps =
        stop.type === "pickup" || stop.type === "storage"
            ? ["En route", "Arrived", "Loading", "Completed"]
            : ["En route", "Arrived", "Unloading", "Completed"];

    const statusMap = [1, 2, 3, 5]; // indices into STOP_STATUS_ORDER

    return steps.map((label, i) => ({
        label,
        done: statusIdx >= statusMap[i],
        active: statusIdx === statusMap[i],
    }));
}
