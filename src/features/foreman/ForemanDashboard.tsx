
import { useQuery } from "@tanstack/react-query";
import { useCreaoAuth } from "@/sdk/core/auth";
import { JobORM, JobStatus } from "@/sdk/database/orm/orm_job";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import { HardHat, Truck, Map, Plus, Users } from "lucide-react"; // HardHat for Foreman
import { useState } from "react";
import { ResourceAssignmentDialog } from "./components/ResourceAssignmentDialog";
import { VehiclesView } from "../vehicles/components/VehiclesView";
import { ReportIncidentDialog } from "../worker/components/ReportIncidentDialog";
import { LogHoursDialog } from "../worker/components/LogHoursDialog";

export function ForemanDashboard() {
    const { companyId } = useCreaoAuth();
    const navigate = useNavigate();

    const [assignmentJob, setAssignmentJob] = useState<{ id: string, title: string } | null>(null);

    // Fetch Active Jobs
    const { data: jobs = [], isLoading } = useQuery({
        queryKey: ["foreman-jobs", companyId],
        enabled: !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            // Foreman sees all active jobs for the company
            return await JobORM.getInstance().getJobsByCompanyId(companyId);
        }
    });

    // Fetch Workers
    const { data: workers = [] } = useQuery({
        queryKey: ["workers", companyId],
        enabled: !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            return await import("@/sdk/database/orm/orm_worker").then(m => m.WorkerORM.getInstance().getWorkersByCompanyId(companyId));
        }
    });

    // Fetch Vehicles
    const { data: vehicles = [] } = useQuery({
        queryKey: ["vehicles", companyId],
        enabled: !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            return await import("@/sdk/database/orm/orm_vehicle").then(m => m.VehicleORM.getInstance().getVehiclesByCompanyId(companyId));
        }
    });

    // Fetch Equipment
    const { data: equipment = [] } = useQuery({
        queryKey: ["equipment", companyId],
        enabled: !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            return await import("@/sdk/database/orm/orm_equipment").then(m => m.EquipmentORM.getInstance().getEquipmentByCompanyId(companyId));
        }
    });

    // Fetch All Assignments (Crew)
    const { data: assignments = [] } = useQuery({
        queryKey: ["all-assignments", companyId],
        enabled: !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            return await import("@/sdk/database/orm/orm_job_worker_assignment").then(m => m.JobWorkerAssignmentORM.getInstance().getJobWorkerAssignmentByCompanyId(companyId));
        }
    });

    // Fetch All Assignments (Vehicles)
    const { data: vehicleAssignments = [] } = useQuery({
        queryKey: ["all-vehicle-assignments", companyId],
        enabled: !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            return await import("@/sdk/database/orm/orm_job_vehicle_assignment").then(m => m.JobVehicleAssignmentORM.getInstance().getJobVehicleAssignmentByCompanyId(companyId));
        }
    });

    // Fetch All Assignments (Equipment)
    const { data: equipmentAllocations = [] } = useQuery({
        queryKey: ["all-equipment-allocations", companyId],
        enabled: !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            return await import("@/sdk/database/orm/orm_job_equipment_allocation").then(m => m.JobEquipmentAllocationORM.getInstance().getJobEquipmentAllocationByCompanyId(companyId));
        }
    });

    // Explicitly include Booked (2), InProgress (3), EnRoute (6), Arrived (7), Loading (8), onWayToDropoff (9), Unloading (10)
    // Exclude Unspecified (0), Quote (1), Completed (4), Canceled (5)
    const activeJobs = jobs.filter(j => {
        // Safe check for status, handling potential string/number mismatch if API returns varied types
        const s = Number(j.status);
        return s === JobStatus.Booked ||
            s === JobStatus.InProgress ||
            s === JobStatus.EnRoute ||
            s === JobStatus.Arrived ||
            s === JobStatus.Loading ||
            s === JobStatus.onWayToDropoff ||
            s === JobStatus.Unloading;
    });

    const getAssignedResources = (jobId: string) => {
        // Crew
        const jobCrew = assignments.filter(a => a.job_id === jobId).map(a => a.worker_id);
        const crew = workers.filter(w => jobCrew.includes(w.id));

        // Vehicles
        const jobVehicles = vehicleAssignments.filter(a => a.job_id === jobId).map(a => a.vehicle_id);
        const assignedVehicles = vehicles.filter(v => jobVehicles.includes(v.id));

        // Equipment
        const jobEquipment = equipmentAllocations.filter(a => a.job_id === jobId).map(a => a.equipment_id);
        const assignedEquipment = equipment.filter(e => jobEquipment.includes(e.id));

        return { crew, assignedVehicles, assignedEquipment };
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Field Operations</h1>
                    <p className="text-muted-foreground">Foreman Dashboard</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => navigate({ to: "/get-quote" })}>
                        <Plus className="mr-2 h-4 w-4" /> New Field Quote
                    </Button>
                    <ReportIncidentDialog />
                    <LogHoursDialog />
                </div>
            </div>

            <Tabs defaultValue="jobs">
                <TabsList>
                    <TabsTrigger value="jobs">Active Jobs ({activeJobs.length})</TabsTrigger>
                    <TabsTrigger value="workers">Crew Availability</TabsTrigger>
                    <TabsTrigger value="vehicles">Fleet Status</TabsTrigger>
                </TabsList>

                <TabsContent value="jobs" className="space-y-4 mt-4">
                    {activeJobs.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                            <h3 className="text-lg font-medium">No Active Jobs</h3>
                            <p className="text-muted-foreground">Jobs with status 'Booked' or 'In Progress' will appear here.</p>
                        </div>
                    )}
                    {activeJobs.map(job => {
                        const { crew, assignedVehicles, assignedEquipment } = getAssignedResources(job.id);
                        return (
                            <Card key={job.id}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-xl font-bold">{job.customer_name}</CardTitle>
                                    <Badge>{JobStatus[job.status]}</Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-2 gap-4 mt-2">
                                        <div>
                                            <div className="text-sm font-medium text-muted-foreground">Pickup</div>
                                            <div>{job.pickup_address}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-muted-foreground">Scheduled</div>
                                            <div>{new Date(job.scheduled_date).toLocaleDateString()}</div>
                                        </div>
                                    </div>

                                    {/* Resources Display */}
                                    <div className="mt-4 space-y-3">
                                        {/* Crew */}
                                        <div>
                                            <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Crew</div>
                                            {crew.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {crew.map(w => (
                                                        <Badge key={w.id} variant="secondary" className="flex items-center gap-1">
                                                            <Users className="h-3 w-3" /> {w.full_name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : <div className="text-xs text-muted-foreground italic">No crew assigned</div>}
                                        </div>

                                        {/* Vehicles */}
                                        {assignedVehicles.length > 0 && (
                                            <div>
                                                <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Vehicles</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {assignedVehicles.map(v => (
                                                        <Badge key={v.id} variant="outline" className="flex items-center gap-1 border-blue-200 bg-blue-50 text-blue-700">
                                                            <Truck className="h-3 w-3" /> {v.vehicle_name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Equipment */}
                                        {assignedEquipment.length > 0 && (
                                            <div>
                                                <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Equipment</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {assignedEquipment.map(e => {
                                                        const alloc = equipmentAllocations.find(a => a.job_id === job.id && a.equipment_id === e.id);
                                                        const qty = alloc?.quantity_assigned || 0;
                                                        return (
                                                            <Badge key={e.id} variant="outline" className="flex items-center gap-1 border-orange-200 bg-orange-50 text-orange-700">
                                                                <Map className="h-3 w-3" /> {e.name} {qty > 1 && <span className="text-[10px] ml-1 font-bold">x{qty}</span>}
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 flex gap-2">
                                        <Button variant="default" size="sm" onClick={() => navigate({ to: `/foreman/jobs/${job.id}` })}>
                                            <HardHat className="mr-2 h-4 w-4" /> Start Job
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setAssignmentJob({ id: job.id, title: job.customer_name })}>
                                            <Users className="mr-2 h-4 w-4" /> Manage Resources
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </TabsContent>

                <TabsContent value="workers">
                    <Card><CardContent className="p-8 text-center text-muted-foreground">Worker Schedule View Coming Soon</CardContent></Card>
                </TabsContent>
                <TabsContent value="vehicles">
                    <VehiclesView vehicles={vehicles} companyId={companyId || ""} canManageFleet={false} />
                </TabsContent>
            </Tabs>

            {/* Assignment Dialog */}
            <ResourceAssignmentDialog
                isOpen={!!assignmentJob}
                onClose={() => setAssignmentJob(null)}
                jobId={assignmentJob?.id || ""}
                jobTitle={assignmentJob?.title || ""}
            />
        </div>
    );
}
