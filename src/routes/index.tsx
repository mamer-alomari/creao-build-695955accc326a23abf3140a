import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Calendar, Users, Package, Truck, DollarSign, Clock } from "lucide-react";
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

const DEMO_COMPANY_ID = "demo-company-id";

function App() {
	const [activeTab, setActiveTab] = useState("dashboard");
	const queryClient = useQueryClient();

	const { data: company } = useQuery({
		queryKey: ["company", DEMO_COMPANY_ID],
		queryFn: async () => {
			const companyOrm = CompanyORM.getInstance();
			let companies = await companyOrm.getAllCompany();
			if (companies.length === 0) {
				const newCompanies = await companyOrm.insertCompany([
					{
						name: "Swift Movers LLC",
						contact_email: "contact@swiftmovers.com",
						license_number: "MV-2024-001",
					} as CompanyModel,
				]);
				return newCompanies[0];
			}
			return companies[0];
		},
	});

	const { data: jobs = [] } = useQuery({
		queryKey: ["jobs"],
		queryFn: async () => {
			const jobOrm = JobORM.getInstance();
			return await jobOrm.getAllJob();
		},
	});

	const { data: workers = [] } = useQuery({
		queryKey: ["workers"],
		queryFn: async () => {
			const workerOrm = WorkerORM.getInstance();
			return await workerOrm.getAllWorker();
		},
	});

	const { data: equipment = [] } = useQuery({
		queryKey: ["equipment"],
		queryFn: async () => {
			const equipmentOrm = EquipmentORM.getInstance();
			return await equipmentOrm.getAllEquipment();
		},
	});

	const { data: vehicles = [] } = useQuery({
		queryKey: ["vehicles"],
		queryFn: async () => {
			const vehicleOrm = VehicleORM.getInstance();
			return await vehicleOrm.getAllVehicle();
		},
	});

	const { data: payrollRecords = [] } = useQuery({
		queryKey: ["payrollRecords"],
		queryFn: async () => {
			const payrollOrm = PayrollRecordORM.getInstance();
			return await payrollOrm.getAllPayrollRecord();
		},
	});

	const { data: jobAssignments = [] } = useQuery({
		queryKey: ["jobAssignments"],
		queryFn: async () => {
			const assignmentOrm = JobWorkerAssignmentORM.getInstance();
			return await assignmentOrm.getAllJobWorkerAssignment();
		},
	});

	const { data: vehicleAssignments = [] } = useQuery({
		queryKey: ["vehicleAssignments"],
		queryFn: async () => {
			const assignmentOrm = JobVehicleAssignmentORM.getInstance();
			return await assignmentOrm.getAllJobVehicleAssignment();
		},
	});

	const { data: equipmentAllocations = [] } = useQuery({
		queryKey: ["equipmentAllocations"],
		queryFn: async () => {
			const allocationOrm = JobEquipmentAllocationORM.getInstance();
			return await allocationOrm.getAllJobEquipmentAllocation();
		},
	});

	const activeWorkers = workers.filter((w) => w.status === WorkerStatus.Active);
	const upcomingJobs = jobs.filter((j) => j.status === JobStatus.Booked || j.status === JobStatus.InProgress);

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
							companyId={company?.id || ""}
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
							companyId={company?.id || ""}
						/>
					</TabsContent>

					<TabsContent value="workers" className="m-0">
						<WorkersView
							workers={workers}
							companyId={company?.id || ""}
						/>
					</TabsContent>

					<TabsContent value="equipment" className="m-0">
						<EquipmentView
							equipment={equipment}
							companyId={company?.id || ""}
						/>
					</TabsContent>

					<TabsContent value="vehicles" className="m-0">
						<VehiclesView
							vehicles={vehicles}
							companyId={company?.id || ""}
						/>
					</TabsContent>

					<TabsContent value="payroll" className="m-0">
						<PayrollView
							payrollRecords={payrollRecords}
							workers={workers}
							companyId={company?.id || ""}
						/>
					</TabsContent>
				</Tabs>
			</main>
		</div>
	);
}

// Add Button component import needed for sidebar
import { Button } from "@/components/ui/button";
