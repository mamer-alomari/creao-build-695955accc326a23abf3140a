"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUpcomingJobs = exports.getWorkerUtilization = exports.getCompanyDashboardStats = exports.getRevenueByMonth = exports.getJobsByStatusThisWeek = exports.getAvailableWorkersForDate = void 0;
const admin_db_1 = require("../lib/admin-db");
const _base_1 = require("./_base");
const enums_1 = require("../types/enums");
const validators_1 = require("../lib/validators");
const READ = [enums_1.WorkerRole.Foreman, enums_1.WorkerRole.Manager, enums_1.WorkerRole.Admin];
async function _getAvailableWorkersForDate(_ctx, input) {
    const db = (0, admin_db_1.getDb)();
    // Get all active workers
    const workersSnap = await db.collection("workers")
        .where("company_id", "==", input.company_id)
        .where("status", "==", 1) // Active
        .get();
    const results = [];
    for (const wDoc of workersSnap.docs) {
        const worker = Object.assign({ id: wDoc.id }, wDoc.data());
        // Check schedule
        const schedSnap = await db.collection("worker_schedules")
            .where("worker_id", "==", worker.id)
            .where("date", "==", input.date)
            .limit(1)
            .get();
        const isAvailable = schedSnap.empty || schedSnap.docs[0].data().is_available;
        // Check active assignments for jobs on that date
        const jobsOnDate = await db.collection("jobs")
            .where("company_id", "==", input.company_id)
            .where("scheduled_date", "==", input.date)
            .get();
        let activeAssignments = 0;
        if (!jobsOnDate.empty) {
            const jobIds = jobsOnDate.docs.map((d) => d.id);
            // Firestore 'in' supports up to 30 values
            for (let i = 0; i < jobIds.length; i += 30) {
                const chunk = jobIds.slice(i, i + 30);
                const assignSnap = await db.collection("job_worker_assignments")
                    .where("worker_id", "==", worker.id)
                    .where("job_id", "in", chunk)
                    .get();
                activeAssignments += assignSnap.size;
            }
        }
        results.push({
            worker,
            is_scheduled_available: isAvailable,
            active_assignments: activeAssignments,
        });
    }
    return (0, _base_1.ok)(results);
}
async function _getJobsByStatusThisWeek(_ctx, input) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    const snap = await (0, admin_db_1.getDb)().collection("jobs")
        .where("company_id", "==", input.company_id)
        .where("scheduled_date", ">=", startOfWeek.toISOString())
        .where("scheduled_date", "<", endOfWeek.toISOString())
        .get();
    const counts = {};
    for (const doc of snap.docs) {
        const status = doc.data().status;
        counts[status] = (counts[status] || 0) + 1;
    }
    return (0, _base_1.ok)(Object.entries(counts).map(([s, c]) => ({ status: Number(s), count: c })));
}
async function _getRevenueByMonth(_ctx, input) {
    const snap = await (0, admin_db_1.getDb)().collection("jobs")
        .where("company_id", "==", input.company_id)
        .where("status", "==", enums_1.JobStatus.Completed)
        .where("scheduled_date", ">=", input.start_date)
        .where("scheduled_date", "<=", input.end_date)
        .get();
    const months = {};
    for (const doc of snap.docs) {
        const data = doc.data();
        const date = new Date(data.scheduled_date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!months[key])
            months[key] = { revenue: 0, count: 0 };
        months[key].revenue += data.final_quote_amount || 0;
        months[key].count += 1;
    }
    return (0, _base_1.ok)(Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({ month, revenue: Math.round(v.revenue * 100) / 100, job_count: v.count })));
}
async function _getCompanyDashboardStats(_ctx, input) {
    const db = (0, admin_db_1.getDb)();
    const cid = input.company_id;
    const [jobsSnap, workersSnap, vehiclesSnap, quotesSnap, incidentsSnap] = await Promise.all([
        db.collection("jobs").where("company_id", "==", cid).get(),
        db.collection("workers").where("company_id", "==", cid).get(),
        db.collection("vehicles").where("company_id", "==", cid).get(),
        db.collection("quotes").where("company_id", "==", cid).where("status", "==", "PENDING").get(),
        db.collection("incidents").where("company_id", "==", cid).where("status", "==", "open").get(),
    ]);
    const jobs = jobsSnap.docs.map((d) => d.data());
    const activeStatuses = [enums_1.JobStatus.InProgress, enums_1.JobStatus.EnRoute, enums_1.JobStatus.Arrived, enums_1.JobStatus.Loading, enums_1.JobStatus.onWayToDropoff, enums_1.JobStatus.Unloading];
    return (0, _base_1.ok)({
        total_jobs: jobs.length,
        active_jobs: jobs.filter((j) => activeStatuses.includes(j.status)).length,
        completed_jobs: jobs.filter((j) => j.status === enums_1.JobStatus.Completed).length,
        total_workers: workersSnap.size,
        active_workers: workersSnap.docs.filter((d) => d.data().status === 1).length,
        total_vehicles: vehiclesSnap.size,
        pending_quotes: quotesSnap.size,
        open_incidents: incidentsSnap.size,
    });
}
async function _getWorkerUtilization(_ctx, input) {
    const db = (0, admin_db_1.getDb)();
    // Get jobs in range
    const jobsSnap = await db.collection("jobs")
        .where("company_id", "==", input.company_id)
        .where("scheduled_date", ">=", input.start_date)
        .where("scheduled_date", "<=", input.end_date)
        .get();
    if (jobsSnap.empty)
        return (0, _base_1.ok)([]);
    const jobIds = jobsSnap.docs.map((d) => d.id);
    const assignmentCounts = {};
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
    // Get worker names
    const workerIds = Object.keys(assignmentCounts);
    const results = [];
    for (let i = 0; i < workerIds.length; i += 30) {
        const chunk = workerIds.slice(i, i + 30);
        const workersSnap = await db.collection("workers")
            .where("id", "in", chunk)
            .get();
        const nameMap = {};
        for (const d of workersSnap.docs)
            nameMap[d.data().id] = d.data().full_name;
        for (const wid of chunk) {
            results.push({
                worker_id: wid,
                worker_name: nameMap[wid] || "Unknown",
                assignment_count: assignmentCounts[wid],
            });
        }
    }
    return (0, _base_1.ok)(results.sort((a, b) => b.assignment_count - a.assignment_count));
}
// --- Upcoming jobs ---
async function _getUpcomingJobs(_ctx, input) {
    const now = new Date();
    const end = new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000);
    const snap = await (0, admin_db_1.getDb)().collection("jobs")
        .where("company_id", "==", input.company_id)
        .where("scheduled_date", ">=", now.toISOString())
        .where("scheduled_date", "<=", end.toISOString())
        .orderBy("scheduled_date", "asc")
        .get();
    return (0, _base_1.ok)(snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))));
}
exports.getAvailableWorkersForDate = (0, _base_1.withValidation)(validators_1.GetAvailableWorkersSchema, (0, _base_1.withAuth)(READ, _getAvailableWorkersForDate));
exports.getJobsByStatusThisWeek = (0, _base_1.withValidation)(validators_1.ListByCompanySchema, (0, _base_1.withAuth)(READ, _getJobsByStatusThisWeek));
exports.getRevenueByMonth = (0, _base_1.withValidation)(validators_1.DateRangeSchema, (0, _base_1.withAuth)(READ, _getRevenueByMonth));
exports.getCompanyDashboardStats = (0, _base_1.withValidation)(validators_1.ListByCompanySchema, (0, _base_1.withAuth)(READ, _getCompanyDashboardStats));
exports.getWorkerUtilization = (0, _base_1.withValidation)(validators_1.DateRangeSchema, (0, _base_1.withAuth)(READ, _getWorkerUtilization));
exports.getUpcomingJobs = (0, _base_1.withValidation)(validators_1.GetUpcomingJobsSchema, (0, _base_1.withAuth)(READ, _getUpcomingJobs));
//# sourceMappingURL=analytics.js.map