import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCreaoAuth } from "@/sdk/core/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Calendar, Users, Package, Truck, DollarSign, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

import { CompanyORM, type CompanyModel } from "@/sdk/database/orm/orm_company";
import { JobORM, type JobModel, JobStatus } from "@/sdk/database/orm/orm_job";
import { WorkerORM, type WorkerModel, WorkerStatus } from "@/sdk/database/orm/orm_worker";
import { EquipmentORM, type EquipmentModel } from "@/sdk/database/orm/orm_equipment";
import { VehicleORM, type VehicleModel } from "@/sdk/database/orm/orm_vehicle";
import { PayrollRecordORM, type PayrollRecordModel } from "@/sdk/database/orm/orm_payroll_record";
import { JobWorkerAssignmentORM, type JobWorkerAssignmentModel } from "@/sdk/database/orm/orm_job_worker_assignment";
import { JobVehicleAssignmentORM, type JobVehicleAssignmentModel } from "@/sdk/database/orm/orm_job_vehicle_assignment";
import { JobEquipmentAllocationORM, type JobEquipmentAllocationModel } from "@/sdk/database/orm/orm_job_equipment_allocation";

import { DashboardView } from "@/features/dashboard/components/DashboardView";
import { JobsView } from "@/features/jobs/components/JobsView";
import { WorkersView } from "@/features/workers/components/WorkersView";
import { EquipmentView } from "@/features/equipment/components/EquipmentView";
import { VehiclesView } from "@/features/vehicles/components/VehiclesView";
import { PayrollView } from "@/features/payroll/components/PayrollView";
import { SchedulingView } from "@/features/scheduling/components/SchedulingView";

export const Route = createFileRoute("/")({
	component: App,
});

function App() {
	const [activeTab, setActiveTab] = useState("dashboard");
	const queryClient = useQueryClient();
	const { isAuthenticated, isLoading, companyId, role } = useCreaoAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (!isLoading) {
			if (!isAuthenticated) {
				navigate({ to: "/login" });
			} else if (role === "customer") {
				navigate({ to: "/portal" });
			} else if (!companyId) {
				// If authenticated but no company, go to onboarding
				navigate({ to: "/onboarding" });
			}
		}
	}, [isLoading, isAuthenticated, companyId, role, navigate]);

	const { data: company } = useQuery({
		queryKey: ["company", companyId],
		enabled: !!companyId,
		queryFn: async () => {
			if (!companyId) return null;
			const companyOrm = CompanyORM.getInstance();
			const result = await companyOrm.getCompanyById(companyId);
			return result[0] || null;
		},
	});

	const { data: jobs = [] } = useQuery({
		queryKey: ["jobs", companyId],
		enabled: !!companyId,
		queryFn: async () => {
			if (!companyId) return [];
			const jobOrm = JobORM.getInstance();
			return await jobOrm.getJobsByCompanyId(companyId);
		},
	});

	const { data: workers = [] } = useQuery({
		queryKey: ["workers", companyId],
		enabled: !!companyId,
		queryFn: async () => {
			if (!companyId) return [];
			const workerOrm = WorkerORM.getInstance();
			return await workerOrm.getWorkersByCompanyId(companyId);
		},
	});

	const { data: equipment = [] } = useQuery({
		queryKey: ["equipment", companyId],
		enabled: !!companyId,
		queryFn: async () => {
			if (!companyId) return [];
			const equipmentOrm = EquipmentORM.getInstance();
			return await equipmentOrm.getEquipmentByCompanyId(companyId);
		},
	});

	const { data: vehicles = [] } = useQuery({
		queryKey: ["vehicles", companyId],
		enabled: !!companyId,
		queryFn: async () => {
			if (!companyId) return [];
			const vehicleOrm = VehicleORM.getInstance();
			return await vehicleOrm.getVehiclesByCompanyId(companyId);
		},
	});

	const { data: payrollRecords = [] } = useQuery({
		queryKey: ["payrollRecords", companyId],
		enabled: !!companyId,
		queryFn: async () => {
			if (!companyId) return [];
			const payrollOrm = PayrollRecordORM.getInstance();
			return await payrollOrm.getPayrollRecordsByCompanyId(companyId);
		},
	});

	const { data: jobAssignments = [] } = useQuery({
		queryKey: ["jobAssignments", companyId],
		enabled: !!companyId,
		queryFn: async () => {
			if (!companyId) return [];
			const assignmentOrm = JobWorkerAssignmentORM.getInstance();
			return await assignmentOrm.getJobWorkerAssignmentByCompanyId(companyId);
		},
	});

	const { data: vehicleAssignments = [] } = useQuery({
		queryKey: ["vehicleAssignments", companyId],
		enabled: !!companyId,
		queryFn: async () => {
			if (!companyId) return [];
			const assignmentOrm = JobVehicleAssignmentORM.getInstance();
			return await assignmentOrm.getJobVehicleAssignmentByCompanyId(companyId);
		},
	});

	const { data: equipmentAllocations = [] } = useQuery({
		queryKey: ["equipmentAllocations", companyId],
		enabled: !!companyId,
		queryFn: async () => {
			if (!companyId) return [];
			const allocationOrm = JobEquipmentAllocationORM.getInstance();
			return await allocationOrm.getJobEquipmentAllocationByCompanyId(companyId);
		},
	});

	const activeWorkers = workers.filter((w) => w.status === WorkerStatus.Active);
	const upcomingJobs = jobs.filter((j) => j.status === JobStatus.Booked || j.status === JobStatus.InProgress);

	if (isLoading) {
		return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
	}

	// Auth check is handled by useEffect, but render nothing if not auth
	if (!isAuthenticated && !isLoading) return null;

	return (
		<div className="flex min-h-[calc(100vh-3.5rem)]">
			{/* Sidebar Navigation */}
			<aside className="w-64 border-r bg-muted/30 p-4 shrink-0">
				<div className="mb-6">
					<h2 className="text-lg font-bold tracking-tight px-2">{company?.name || "Loading..."}</h2>
					<p className="text-sm text-muted-foreground px-2">Moving Company Manager</p>
				</div>
				<nav className="space-y-1">
					<Button
						variant={activeTab === "dashboard" ? "secondary" : "ghost"}
						className="w-full justify-start"
						onClick={() => setActiveTab("dashboard")}
					>
						<LayoutDashboard className="mr-2 h-4 w-4" />
						Dashboard
					</Button>
					<Button
						variant={activeTab === "jobs" ? "secondary" : "ghost"}
						className="w-full justify-start"
						onClick={() => setActiveTab("jobs")}
					>
						<Calendar className="mr-2 h-4 w-4" />
						Jobs
					</Button>
					<Button
						variant={activeTab === "scheduling" ? "secondary" : "ghost"}
						className="w-full justify-start"
						onClick={() => setActiveTab("scheduling")}
					>
						<Clock className="mr-2 h-4 w-4" />
						Scheduling
					</Button>
					<Button
						variant={activeTab === "workers" ? "secondary" : "ghost"}
						className="w-full justify-start"
						onClick={() => setActiveTab("workers")}
					>
						<Users className="mr-2 h-4 w-4" />
						Workers
					</Button>
					<Button
						variant={activeTab === "equipment" ? "secondary" : "ghost"}
						className="w-full justify-start"
						onClick={() => setActiveTab("equipment")}
					>
						<Package className="mr-2 h-4 w-4" />
						Equipment
					</Button>
					<Button
						variant={activeTab === "vehicles" ? "secondary" : "ghost"}
						className="w-full justify-start"
						onClick={() => setActiveTab("vehicles")}
					>
						<Truck className="mr-2 h-4 w-4" />
						Vehicles
					</Button>
					<Button
						variant={activeTab === "payroll" ? "secondary" : "ghost"}
						className="w-full justify-start"
						onClick={() => setActiveTab("payroll")}
					>
						<DollarSign className="mr-2 h-4 w-4" />
						Payroll
					</Button>
				</nav>
			</aside>

			{/* Main Content */}
			<main className="flex-1 p-6 overflow-auto">
				<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
					<TabsContent value="dashboard" className="m-0">
						<DashboardView
							jobs={jobs}
							workers={workers}
							equipment={equipment}
							vehicles={vehicles}
							activeWorkers={activeWorkers}
							upcomingJobs={upcomingJobs}
						/>
					</TabsContent>

					<TabsContent value="jobs" className="m-0">
						<JobsView
							jobs={jobs}
							workers={workers}
							vehicles={vehicles}
							equipment={equipment}
							companyId={companyId || ""}
						/>
					</TabsContent>

					<TabsContent value="scheduling" className="m-0">
						<SchedulingView
							jobs={jobs}
							workers={workers}
							equipment={equipment}
							vehicles={vehicles}
							jobAssignments={jobAssignments}
							vehicleAssignments={vehicleAssignments}
							equipmentAllocations={equipmentAllocations}
							companyId={companyId || ""}
						/>
					</TabsContent>

					<TabsContent value="workers" className="m-0">
						<WorkersView
							workers={workers}
							companyId={companyId || ""}
						/>
					</TabsContent>

					<TabsContent value="equipment" className="m-0">
						<EquipmentView
							equipment={equipment}
							companyId={companyId || ""}
						/>
					</TabsContent>

					<TabsContent value="vehicles" className="m-0">
						<VehiclesView
							vehicles={vehicles}
							companyId={companyId || ""}
						/>
					</TabsContent>

					<TabsContent value="payroll" className="m-0">
						<PayrollView
							payrollRecords={payrollRecords}
							workers={workers}
							companyId={companyId || ""}
						/>
					</TabsContent>
				</Tabs>
			</main>
		</div>
	);
}
