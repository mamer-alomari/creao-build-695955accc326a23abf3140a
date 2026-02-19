import { JobStatus } from "@/sdk/database/orm/orm_job";
import { CheckCircle2, Circle, Truck, MapPin, Package, Navigation, Home } from "lucide-react";

interface JobTimelineProps {
    currentStatus: JobStatus;
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

export function JobTimeline({ currentStatus }: JobTimelineProps) {
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
                            {/* Connector line */}
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
                            {/* Label */}
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
