import { getDb } from "../lib/admin-db";
import { ActionResult, AuthContext, ok, withAuth, withValidation } from "./_base";
import { JobStatus, UserRole, WorkerStatus } from "../types/enums";
import { WorkerModel, JobModel } from "../types/models";
import {
  GetAvailableWorkersInput,
  ListByCompanyInput,
  DateRangeInput,
  GetUpcomingJobsInput,
} from "../types/action-types";
import {
  GetAvailableWorkersSchema,
  ListByCompanySchema,
  DateRangeSchema,
  GetUpcomingJobsSchema,
} from "../lib/validators";

const READ = [UserRole.Foreman, UserRole.Manager, UserRole.Admin];

// --- Available workers for a date ---
interface AvailableWorkerResult {
  worker: WorkerModel;
  is_scheduled_available: boolean;
  active_assignments: number;
}

async function _getAvailableWorkersForDate(
  _ctx: AuthContext,
  input: GetAvailableWorkersInput
): Promise<ActionResult<AvailableWorkerResult[]>> {
  const db = getDb();

  // Get all active workers
  const workersSnap = await db.collection("workers")
    .where("company_id", "==", input.company_id)
    .where("status", "==", WorkerStatus.Active)
    .get();

  if (workersSnap.empty) return ok([]);

  const workers = workersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkerModel));
  const workerIds = workers.map((w) => w.id);

  // Batch-fetch schedules for all workers on this date
  const scheduleMap: Record<string, boolean> = {};
  for (let i = 0; i < workerIds.length; i += 30) {
    const chunk = workerIds.slice(i, i + 30);
    const schedSnap = await db.collection("worker_schedules")
      .where("worker_id", "in", chunk)
      .where("date", "==", input.date)
      .get();
    for (const doc of schedSnap.docs) {
      scheduleMap[doc.data().worker_id] = doc.data().is_available;
    }
  }

  // Get jobs on this date, then batch-fetch assignments
  const jobsOnDate = await db.collection("jobs")
    .where("company_id", "==", input.company_id)
    .where("scheduled_date", "==", input.date)
    .get();

  const assignmentCounts: Record<string, number> = {};
  if (!jobsOnDate.empty) {
    const jobIds = jobsOnDate.docs.map((d) => d.id);
    for (let i = 0; i < jobIds.length; i += 30) {
      const chunk = jobIds.slice(i, i + 30);
      const assignSnap = await db.collection("job_worker_assignments")
        .where("job_id", "in", chunk)
        .get();
      for (const doc of assignSnap.docs) {
        const wid = doc.data().worker_id;
        assignmentCounts[wid] = (assignmentCounts[wid] || 0) + 1;
      }
    }
  }

  const results: AvailableWorkerResult[] = workers.map((worker) => ({
    worker,
    is_scheduled_available: scheduleMap[worker.id] ?? true, // default available if no schedule entry
    active_assignments: assignmentCounts[worker.id] || 0,
  }));

  return ok(results);
}

// --- Jobs by status this week ---
interface StatusCount {
  status: number;
  count: number;
}

async function _getJobsByStatusThisWeek(
  _ctx: AuthContext,
  input: ListByCompanyInput
): Promise<ActionResult<StatusCount[]>> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const snap = await getDb().collection("jobs")
    .where("company_id", "==", input.company_id)
    .where("scheduled_date", ">=", startOfWeek.toISOString())
    .where("scheduled_date", "<", endOfWeek.toISOString())
    .get();

  const counts: Record<number, number> = {};
  for (const doc of snap.docs) {
    const status = doc.data().status as number;
    counts[status] = (counts[status] || 0) + 1;
  }

  return ok(Object.entries(counts).map(([s, c]) => ({ status: Number(s), count: c })));
}

// --- Revenue by month ---
interface MonthlyRevenue {
  month: string;
  revenue: number;
  job_count: number;
}

async function _getRevenueByMonth(
  _ctx: AuthContext,
  input: DateRangeInput
): Promise<ActionResult<MonthlyRevenue[]>> {
  const snap = await getDb().collection("jobs")
    .where("company_id", "==", input.company_id)
    .where("status", "==", JobStatus.Completed)
    .where("scheduled_date", ">=", input.start_date)
    .where("scheduled_date", "<=", input.end_date)
    .get();

  const months: Record<string, { revenue: number; count: number }> = {};

  for (const doc of snap.docs) {
    const data = doc.data();
    const date = new Date(data.scheduled_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!months[key]) months[key] = { revenue: 0, count: 0 };
    months[key].revenue += data.final_quote_amount || 0;
    months[key].count += 1;
  }

  return ok(
    Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, revenue: Math.round(v.revenue * 100) / 100, job_count: v.count }))
  );
}

// --- Dashboard stats ---
interface DashboardStats {
  total_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  total_workers: number;
  active_workers: number;
  total_vehicles: number;
  pending_quotes: number;
  open_incidents: number;
}

async function _getCompanyDashboardStats(
  _ctx: AuthContext,
  input: ListByCompanyInput
): Promise<ActionResult<DashboardStats>> {
  const db = getDb();
  const cid = input.company_id;

  const [jobsSnap, workersSnap, vehiclesSnap, quotesSnap, incidentsSnap] = await Promise.all([
    db.collection("jobs").where("company_id", "==", cid).get(),
    db.collection("workers").where("company_id", "==", cid).get(),
    db.collection("vehicles").where("company_id", "==", cid).get(),
    db.collection("quotes").where("company_id", "==", cid).where("status", "==", "PENDING").get(),
    db.collection("incidents").where("company_id", "==", cid).where("status", "==", "open").get(),
  ]);

  const jobs = jobsSnap.docs.map((d) => d.data());
  const activeStatuses = [JobStatus.InProgress, JobStatus.EnRoute, JobStatus.Arrived, JobStatus.Loading, JobStatus.onWayToDropoff, JobStatus.Unloading];

  return ok({
    total_jobs: jobs.length,
    active_jobs: jobs.filter((j) => activeStatuses.includes(j.status)).length,
    completed_jobs: jobs.filter((j) => j.status === JobStatus.Completed).length,
    total_workers: workersSnap.size,
    active_workers: workersSnap.docs.filter((d) => d.data().status === WorkerStatus.Active).length,
    total_vehicles: vehiclesSnap.size,
    pending_quotes: quotesSnap.size,
    open_incidents: incidentsSnap.size,
  });
}

// --- Worker utilization ---
interface WorkerUtilization {
  worker_id: string;
  worker_name: string;
  assignment_count: number;
}

async function _getWorkerUtilization(
  _ctx: AuthContext,
  input: DateRangeInput
): Promise<ActionResult<WorkerUtilization[]>> {
  const db = getDb();

  const jobsSnap = await db.collection("jobs")
    .where("company_id", "==", input.company_id)
    .where("scheduled_date", ">=", input.start_date)
    .where("scheduled_date", "<=", input.end_date)
    .get();

  if (jobsSnap.empty) return ok([]);

  const jobIds = jobsSnap.docs.map((d) => d.id);
  const assignmentCounts: Record<string, number> = {};

  for (let i = 0; i < jobIds.length; i += 30) {
    const chunk = jobIds.slice(i, i + 30);
    const assignSnap = await db.collection("job_worker_assignments")
      .where("job_id", "in", chunk)
      .get();
    for (const doc of assignSnap.docs) {
      const wid = doc.data().worker_id;
      assignmentCounts[wid] = (assignmentCounts[wid] || 0) + 1;
    }
  }

  // Batch-fetch worker names by document ID
  const workerIds = Object.keys(assignmentCounts);
  const nameMap: Record<string, string> = {};
  for (const wid of workerIds) {
    const wDoc = await db.collection("workers").doc(wid).get();
    if (wDoc.exists) nameMap[wid] = wDoc.data()!.full_name;
  }

  const results: WorkerUtilization[] = workerIds.map((wid) => ({
    worker_id: wid,
    worker_name: nameMap[wid] || "Unknown",
    assignment_count: assignmentCounts[wid],
  }));

  return ok(results.sort((a, b) => b.assignment_count - a.assignment_count));
}

// --- Upcoming jobs ---
async function _getUpcomingJobs(
  _ctx: AuthContext,
  input: GetUpcomingJobsInput
): Promise<ActionResult<JobModel[]>> {
  const now = new Date();
  const end = new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000);

  const snap = await getDb().collection("jobs")
    .where("company_id", "==", input.company_id)
    .where("scheduled_date", ">=", now.toISOString())
    .where("scheduled_date", "<=", end.toISOString())
    .orderBy("scheduled_date", "asc")
    .get();

  return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobModel)));
}

export const getAvailableWorkersForDate = withValidation(GetAvailableWorkersSchema, withAuth(READ, _getAvailableWorkersForDate));
export const getJobsByStatusThisWeek = withValidation(ListByCompanySchema, withAuth(READ, _getJobsByStatusThisWeek));
export const getRevenueByMonth = withValidation(DateRangeSchema, withAuth(READ, _getRevenueByMonth));
export const getCompanyDashboardStats = withValidation(ListByCompanySchema, withAuth(READ, _getCompanyDashboardStats));
export const getWorkerUtilization = withValidation(DateRangeSchema, withAuth(READ, _getWorkerUtilization));
export const getUpcomingJobs = withValidation(GetUpcomingJobsSchema, withAuth(READ, _getUpcomingJobs));
