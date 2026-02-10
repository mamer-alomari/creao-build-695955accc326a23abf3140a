import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { type JobModel, JobStatus } from "@/sdk/database/orm/orm_job";
import { type WorkerModel } from "@/sdk/database/orm/orm_worker";
import { type EquipmentModel } from "@/sdk/database/orm/orm_equipment";
import { type VehicleModel } from "@/sdk/database/orm/orm_vehicle";

export function DashboardView({ jobs, workers, equipment, vehicles, activeWorkers, upcomingJobs }: {
	jobs: JobModel[];
	workers: WorkerModel[];
	equipment: EquipmentModel[];
	vehicles: VehicleModel[];
	activeWorkers: WorkerModel[];
	upcomingJobs: JobModel[];
}) {
	const getJobStatusBadge = (status: JobStatus) => {
		const variants: Record<JobStatus, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
			[JobStatus.Unspecified]: { variant: "outline", label: "Unspecified" },
			[JobStatus.Quote]: { variant: "secondary", label: "Quote" },
			[JobStatus.Booked]: { variant: "default", label: "Booked" },
			[JobStatus.InProgress]: { variant: "default", label: "In Progress" },
			[JobStatus.Completed]: { variant: "outline", label: "Completed" },
			[JobStatus.Canceled]: { variant: "destructive", label: "Canceled" },
		};
		const config = variants[status];
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{jobs.length}</div>
						<p className="text-xs text-muted-foreground mt-1">{upcomingJobs.length} upcoming</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium">Active Workers</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{activeWorkers.length}</div>
						<p className="text-xs text-muted-foreground mt-1">of {workers.length} total</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium">Equipment Items</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{equipment.reduce((sum, e) => sum + e.total_quantity, 0)}</div>
						<p className="text-xs text-muted-foreground mt-1">{equipment.length} types</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium">Fleet Vehicles</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{vehicles.length}</div>
						<p className="text-xs text-muted-foreground mt-1">Ready to deploy</p>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Upcoming Jobs</CardTitle>
					<CardDescription>Jobs that are booked or in progress</CardDescription>
				</CardHeader>
				<CardContent>
					{upcomingJobs.length === 0 ? (
						<p className="text-muted-foreground text-center py-8">No upcoming jobs</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Customer</TableHead>
									<TableHead>Date</TableHead>
									<TableHead>Route</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Estimate</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{upcomingJobs.slice(0, 5).map((job) => (
									<TableRow key={job.id}>
										<TableCell className="font-medium">{job.customer_name}</TableCell>
										<TableCell>{new Date(parseInt(job.scheduled_date) * 1000).toLocaleDateString()}</TableCell>
										<TableCell className="text-sm">
											<div className="max-w-xs truncate">{job.pickup_address} → {job.dropoff_address}</div>
										</TableCell>
										<TableCell>{getJobStatusBadge(job.status)}</TableCell>
										<TableCell className="text-right">
											{job.estimated_cost ? `$${job.estimated_cost.toFixed(2)}` : "-"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
