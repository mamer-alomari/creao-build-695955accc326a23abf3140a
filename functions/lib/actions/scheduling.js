"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEquipmentScheduleRange = exports.getVehicleScheduleRange = exports.getWorkerScheduleRange = exports.setEquipmentSchedule = exports.setVehicleSchedule = exports.setWorkerSchedule = exports.deallocateEquipmentFromJob = exports.allocateEquipmentToJob = exports.unassignVehicleFromJob = exports.assignVehicleToJob = exports.unassignWorkerFromJob = exports.assignWorkerToJob = void 0;
const admin_db_1 = require("../lib/admin-db");
const _base_1 = require("./_base");
const enums_1 = require("../types/enums");
const validators_1 = require("../lib/validators");
const SCHED_ROLES = [enums_1.WorkerRole.Foreman, enums_1.WorkerRole.Manager, enums_1.WorkerRole.Admin];
const READ_ROLES = [enums_1.WorkerRole.Worker, enums_1.WorkerRole.Foreman, enums_1.WorkerRole.Manager, enums_1.WorkerRole.Admin];
// --- Worker assignments ---
async function _assignWorkerToJob(ctx, input) {
    const db = (0, admin_db_1.getDb)();
    // Check for existing assignment
    const existing = await db.collection("job_worker_assignments")
        .where("job_id", "==", input.job_id)
        .where("worker_id", "==", input.worker_id)
        .limit(1)
        .get();
    if (!existing.empty)
        return (0, _base_1.err)("Worker is already assigned to this job");
    const now = (0, _base_1.nowISO)();
    const ref = db.collection("job_worker_assignments").doc();
    const assignment = {
        id: ref.id,
        data_creator: ctx.userId,
        data_updater: ctx.userId,
        create_time: now,
        update_time: now,
        company_id: input.company_id,
        job_id: input.job_id,
        worker_id: input.worker_id,
    };
    await ref.set(assignment);
    return (0, _base_1.ok)(assignment);
}
async function _unassignWorkerFromJob(_ctx, input) {
    const db = (0, admin_db_1.getDb)();
    const snap = await db.collection("job_worker_assignments")
        .where("job_id", "==", input.job_id)
        .where("worker_id", "==", input.worker_id)
        .limit(1)
        .get();
    if (snap.empty)
        return (0, _base_1.err)("Assignment not found");
    await snap.docs[0].ref.delete();
    return (0, _base_1.ok)({ deleted: true });
}
// --- Vehicle assignments ---
async function _assignVehicleToJob(ctx, input) {
    const db = (0, admin_db_1.getDb)();
    const existing = await db.collection("job_vehicle_assignments")
        .where("job_id", "==", input.job_id)
        .where("vehicle_id", "==", input.vehicle_id)
        .limit(1)
        .get();
    if (!existing.empty)
        return (0, _base_1.err)("Vehicle is already assigned to this job");
    const now = (0, _base_1.nowISO)();
    const ref = db.collection("job_vehicle_assignments").doc();
    const assignment = {
        id: ref.id,
        data_creator: ctx.userId,
        data_updater: ctx.userId,
        create_time: now,
        update_time: now,
        company_id: input.company_id,
        job_id: input.job_id,
        vehicle_id: input.vehicle_id,
    };
    await ref.set(assignment);
    return (0, _base_1.ok)(assignment);
}
async function _unassignVehicleFromJob(_ctx, input) {
    const db = (0, admin_db_1.getDb)();
    const snap = await db.collection("job_vehicle_assignments")
        .where("job_id", "==", input.job_id)
        .where("vehicle_id", "==", input.vehicle_id)
        .limit(1)
        .get();
    if (snap.empty)
        return (0, _base_1.err)("Assignment not found");
    await snap.docs[0].ref.delete();
    return (0, _base_1.ok)({ deleted: true });
}
// --- Equipment allocations ---
async function _allocateEquipmentToJob(ctx, input) {
    const db = (0, admin_db_1.getDb)();
    // Check available quantity
    const equipDoc = await db.collection("equipment").doc(input.equipment_id).get();
    if (!equipDoc.exists)
        return (0, _base_1.err)("Equipment not found");
    const totalQty = equipDoc.data().total_quantity || 0;
    // Sum currently allocated
    const allocSnap = await db.collection("job_equipment_allocations")
        .where("equipment_id", "==", input.equipment_id)
        .get();
    const allocated = allocSnap.docs.reduce((sum, d) => sum + (d.data().quantity_assigned || 0), 0);
    if (allocated + input.quantity > totalQty) {
        return (0, _base_1.err)(`Insufficient quantity. Available: ${totalQty - allocated}, Requested: ${input.quantity}`);
    }
    const now = (0, _base_1.nowISO)();
    const ref = db.collection("job_equipment_allocations").doc();
    const alloc = {
        id: ref.id,
        data_creator: ctx.userId,
        data_updater: ctx.userId,
        create_time: now,
        update_time: now,
        company_id: input.company_id,
        job_id: input.job_id,
        equipment_id: input.equipment_id,
        quantity_assigned: input.quantity,
    };
    await ref.set(alloc);
    return (0, _base_1.ok)(alloc);
}
async function _deallocateEquipmentFromJob(_ctx, input) {
    const db = (0, admin_db_1.getDb)();
    const snap = await db.collection("job_equipment_allocations")
        .where("job_id", "==", input.job_id)
        .where("equipment_id", "==", input.equipment_id)
        .limit(1)
        .get();
    if (snap.empty)
        return (0, _base_1.err)("Allocation not found");
    await snap.docs[0].ref.delete();
    return (0, _base_1.ok)({ deleted: true });
}
// --- Schedules ---
async function _setWorkerSchedule(ctx, input) {
    const db = (0, admin_db_1.getDb)();
    const now = (0, _base_1.nowISO)();
    // Upsert by worker_id + date
    const existing = await db.collection("worker_schedules")
        .where("worker_id", "==", input.worker_id)
        .where("date", "==", input.date)
        .limit(1)
        .get();
    const schedule = {
        id: existing.empty ? db.collection("worker_schedules").doc().id : existing.docs[0].id,
        worker_id: input.worker_id,
        company_id: input.company_id,
        date: input.date,
        is_available: input.is_available,
        start_time: input.start_time,
        end_time: input.end_time,
        notes: input.notes,
        create_time: existing.empty ? now : existing.docs[0].data().create_time,
        update_time: now,
    };
    const ref = existing.empty
        ? db.collection("worker_schedules").doc(schedule.id)
        : existing.docs[0].ref;
    await ref.set(schedule);
    return (0, _base_1.ok)(schedule);
}
async function _setVehicleSchedule(ctx, input) {
    var _a;
    const db = (0, admin_db_1.getDb)();
    const now = (0, _base_1.nowISO)();
    const existing = await db.collection("vehicle_schedules")
        .where("vehicle_id", "==", input.vehicle_id)
        .where("schedule_date", "==", input.schedule_date)
        .limit(1)
        .get();
    const schedule = {
        id: existing.empty ? db.collection("vehicle_schedules").doc().id : existing.docs[0].id,
        data_creator: existing.empty ? ctx.userId : existing.docs[0].data().data_creator,
        data_updater: ctx.userId,
        create_time: existing.empty ? now : existing.docs[0].data().create_time,
        update_time: now,
        vehicle_id: input.vehicle_id,
        company_id: input.company_id,
        schedule_date: input.schedule_date,
        status: input.status,
        maintenance_type: (_a = input.maintenance_type) !== null && _a !== void 0 ? _a : null,
    };
    const ref = existing.empty
        ? db.collection("vehicle_schedules").doc(schedule.id)
        : existing.docs[0].ref;
    await ref.set(schedule);
    return (0, _base_1.ok)(schedule);
}
async function _setEquipmentSchedule(ctx, input) {
    var _a;
    const db = (0, admin_db_1.getDb)();
    const now = (0, _base_1.nowISO)();
    const existing = await db.collection("equipment_schedules")
        .where("equipment_id", "==", input.equipment_id)
        .where("schedule_date", "==", input.schedule_date)
        .limit(1)
        .get();
    const schedule = {
        id: existing.empty ? db.collection("equipment_schedules").doc().id : existing.docs[0].id,
        data_creator: existing.empty ? ctx.userId : existing.docs[0].data().data_creator,
        data_updater: ctx.userId,
        create_time: existing.empty ? now : existing.docs[0].data().create_time,
        update_time: now,
        equipment_id: input.equipment_id,
        company_id: input.company_id,
        schedule_date: input.schedule_date,
        status: input.status,
        reason: (_a = input.reason) !== null && _a !== void 0 ? _a : null,
    };
    const ref = existing.empty
        ? db.collection("equipment_schedules").doc(schedule.id)
        : existing.docs[0].ref;
    await ref.set(schedule);
    return (0, _base_1.ok)(schedule);
}
async function _getWorkerScheduleRange(_ctx, input) {
    const snap = await (0, admin_db_1.getDb)().collection("worker_schedules")
        .where("worker_id", "==", input.resource_id)
        .where("company_id", "==", input.company_id)
        .where("date", ">=", input.start_date)
        .where("date", "<=", input.end_date)
        .orderBy("date", "asc")
        .get();
    return (0, _base_1.ok)(snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))));
}
async function _getVehicleScheduleRange(_ctx, input) {
    const snap = await (0, admin_db_1.getDb)().collection("vehicle_schedules")
        .where("vehicle_id", "==", input.resource_id)
        .where("company_id", "==", input.company_id)
        .where("schedule_date", ">=", input.start_date)
        .where("schedule_date", "<=", input.end_date)
        .orderBy("schedule_date", "asc")
        .get();
    return (0, _base_1.ok)(snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))));
}
async function _getEquipmentScheduleRange(_ctx, input) {
    const snap = await (0, admin_db_1.getDb)().collection("equipment_schedules")
        .where("equipment_id", "==", input.resource_id)
        .where("company_id", "==", input.company_id)
        .where("schedule_date", ">=", input.start_date)
        .where("schedule_date", "<=", input.end_date)
        .orderBy("schedule_date", "asc")
        .get();
    return (0, _base_1.ok)(snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))));
}
exports.assignWorkerToJob = (0, _base_1.withValidation)(validators_1.AssignWorkerToJobSchema, (0, _base_1.withAuth)(SCHED_ROLES, _assignWorkerToJob));
exports.unassignWorkerFromJob = (0, _base_1.withValidation)(validators_1.UnassignWorkerFromJobSchema, (0, _base_1.withAuth)(SCHED_ROLES, _unassignWorkerFromJob));
exports.assignVehicleToJob = (0, _base_1.withValidation)(validators_1.AssignVehicleToJobSchema, (0, _base_1.withAuth)(SCHED_ROLES, _assignVehicleToJob));
exports.unassignVehicleFromJob = (0, _base_1.withValidation)(validators_1.UnassignVehicleFromJobSchema, (0, _base_1.withAuth)(SCHED_ROLES, _unassignVehicleFromJob));
exports.allocateEquipmentToJob = (0, _base_1.withValidation)(validators_1.AllocateEquipmentToJobSchema, (0, _base_1.withAuth)(SCHED_ROLES, _allocateEquipmentToJob));
exports.deallocateEquipmentFromJob = (0, _base_1.withValidation)(validators_1.DeallocateEquipmentFromJobSchema, (0, _base_1.withAuth)(SCHED_ROLES, _deallocateEquipmentFromJob));
exports.setWorkerSchedule = (0, _base_1.withValidation)(validators_1.SetWorkerScheduleSchema, (0, _base_1.withAuth)(SCHED_ROLES, _setWorkerSchedule));
exports.setVehicleSchedule = (0, _base_1.withValidation)(validators_1.SetVehicleScheduleSchema, (0, _base_1.withAuth)(SCHED_ROLES, _setVehicleSchedule));
exports.setEquipmentSchedule = (0, _base_1.withValidation)(validators_1.SetEquipmentScheduleSchema, (0, _base_1.withAuth)(SCHED_ROLES, _setEquipmentSchedule));
exports.getWorkerScheduleRange = (0, _base_1.withValidation)(validators_1.GetScheduleRangeSchema, (0, _base_1.withAuth)(READ_ROLES, _getWorkerScheduleRange));
exports.getVehicleScheduleRange = (0, _base_1.withValidation)(validators_1.GetScheduleRangeSchema, (0, _base_1.withAuth)(READ_ROLES, _getVehicleScheduleRange));
exports.getEquipmentScheduleRange = (0, _base_1.withValidation)(validators_1.GetScheduleRangeSchema, (0, _base_1.withAuth)(READ_ROLES, _getEquipmentScheduleRange));
//# sourceMappingURL=scheduling.js.map