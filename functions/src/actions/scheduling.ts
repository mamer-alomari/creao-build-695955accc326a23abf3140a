import { getDb } from "../lib/admin-db";
import { ActionResult, AuthContext, ok, err, nowISO, withAuth, withValidation } from "./_base";
import { UserRole } from "../types/enums";
import {
  JobWorkerAssignmentModel,
  JobVehicleAssignmentModel,
  JobEquipmentAllocationModel,
  WorkerScheduleModel,
  VehicleScheduleModel,
  EquipmentScheduleModel,
} from "../types/models";
import {
  AssignWorkerToJobInput,
  UnassignWorkerFromJobInput,
  AssignVehicleToJobInput,
  UnassignVehicleFromJobInput,
  AllocateEquipmentToJobInput,
  DeallocateEquipmentFromJobInput,
  SetWorkerScheduleInput,
  SetVehicleScheduleInput,
  SetEquipmentScheduleInput,
  GetScheduleRangeInput,
} from "../types/action-types";
import {
  AssignWorkerToJobSchema,
  UnassignWorkerFromJobSchema,
  AssignVehicleToJobSchema,
  UnassignVehicleFromJobSchema,
  AllocateEquipmentToJobSchema,
  DeallocateEquipmentFromJobSchema,
  SetWorkerScheduleSchema,
  SetVehicleScheduleSchema,
  SetEquipmentScheduleSchema,
  GetScheduleRangeSchema,
} from "../lib/validators";

const SCHED_ROLES = [UserRole.Foreman, UserRole.Manager, UserRole.Admin];
const READ_ROLES = [UserRole.Worker, UserRole.Foreman, UserRole.Manager, UserRole.Admin];

/**
 * Verify a resource belongs to the expected company before assignment.
 */
async function verifyResourceCompany(
  collection: string,
  resourceId: string,
  expectedCompanyId: string,
  resourceLabel: string
): Promise<string | null> {
  const doc = await getDb().collection(collection).doc(resourceId).get();
  if (!doc.exists) return `${resourceLabel} not found`;
  const data = doc.data()!;
  if (data.company_id && data.company_id !== expectedCompanyId) {
    return `${resourceLabel} belongs to a different company`;
  }
  return null;
}

// --- Worker assignments ---
async function _assignWorkerToJob(ctx: AuthContext, input: AssignWorkerToJobInput): Promise<ActionResult<JobWorkerAssignmentModel>> {
  const db = getDb();

  // Cross-company validation
  const workerErr = await verifyResourceCompany("workers", input.worker_id, input.company_id, "Worker");
  if (workerErr) return err(workerErr);
  const jobErr = await verifyResourceCompany("jobs", input.job_id, input.company_id, "Job");
  if (jobErr) return err(jobErr);

  const existing = await db.collection("job_worker_assignments")
    .where("job_id", "==", input.job_id)
    .where("worker_id", "==", input.worker_id)
    .limit(1)
    .get();
  if (!existing.empty) return err("Worker is already assigned to this job");

  const now = nowISO();
  const ref = db.collection("job_worker_assignments").doc();
  const assignment: JobWorkerAssignmentModel = {
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
  return ok(assignment);
}

async function _unassignWorkerFromJob(_ctx: AuthContext, input: UnassignWorkerFromJobInput): Promise<ActionResult<{ deleted: boolean }>> {
  const db = getDb();
  const snap = await db.collection("job_worker_assignments")
    .where("job_id", "==", input.job_id)
    .where("worker_id", "==", input.worker_id)
    .limit(1)
    .get();
  if (snap.empty) return err("Assignment not found");
  await snap.docs[0].ref.delete();
  return ok({ deleted: true });
}

// --- Vehicle assignments ---
async function _assignVehicleToJob(ctx: AuthContext, input: AssignVehicleToJobInput): Promise<ActionResult<JobVehicleAssignmentModel>> {
  const db = getDb();

  const vehicleErr = await verifyResourceCompany("vehicles", input.vehicle_id, input.company_id, "Vehicle");
  if (vehicleErr) return err(vehicleErr);
  const jobErr = await verifyResourceCompany("jobs", input.job_id, input.company_id, "Job");
  if (jobErr) return err(jobErr);

  const existing = await db.collection("job_vehicle_assignments")
    .where("job_id", "==", input.job_id)
    .where("vehicle_id", "==", input.vehicle_id)
    .limit(1)
    .get();
  if (!existing.empty) return err("Vehicle is already assigned to this job");

  const now = nowISO();
  const ref = db.collection("job_vehicle_assignments").doc();
  const assignment: JobVehicleAssignmentModel = {
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
  return ok(assignment);
}

async function _unassignVehicleFromJob(_ctx: AuthContext, input: UnassignVehicleFromJobInput): Promise<ActionResult<{ deleted: boolean }>> {
  const db = getDb();
  const snap = await db.collection("job_vehicle_assignments")
    .where("job_id", "==", input.job_id)
    .where("vehicle_id", "==", input.vehicle_id)
    .limit(1)
    .get();
  if (snap.empty) return err("Assignment not found");
  await snap.docs[0].ref.delete();
  return ok({ deleted: true });
}

// --- Equipment allocations ---
async function _allocateEquipmentToJob(ctx: AuthContext, input: AllocateEquipmentToJobInput): Promise<ActionResult<JobEquipmentAllocationModel>> {
  const db = getDb();

  const equipErr = await verifyResourceCompany("equipment", input.equipment_id, input.company_id, "Equipment");
  if (equipErr) return err(equipErr);
  const jobErr = await verifyResourceCompany("jobs", input.job_id, input.company_id, "Job");
  if (jobErr) return err(jobErr);

  const equipDoc = await db.collection("equipment").doc(input.equipment_id).get();
  const totalQty = equipDoc.data()!.total_quantity || 0;

  const allocSnap = await db.collection("job_equipment_allocations")
    .where("equipment_id", "==", input.equipment_id)
    .get();
  const allocated = allocSnap.docs.reduce((sum, d) => sum + (d.data().quantity_assigned || 0), 0);

  if (allocated + input.quantity > totalQty) {
    return err(`Insufficient quantity. Available: ${totalQty - allocated}, Requested: ${input.quantity}`);
  }

  const now = nowISO();
  const ref = db.collection("job_equipment_allocations").doc();
  const alloc: JobEquipmentAllocationModel = {
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
  return ok(alloc);
}

async function _deallocateEquipmentFromJob(_ctx: AuthContext, input: DeallocateEquipmentFromJobInput): Promise<ActionResult<{ deleted: boolean }>> {
  const db = getDb();
  const snap = await db.collection("job_equipment_allocations")
    .where("job_id", "==", input.job_id)
    .where("equipment_id", "==", input.equipment_id)
    .limit(1)
    .get();
  if (snap.empty) return err("Allocation not found");
  await snap.docs[0].ref.delete();
  return ok({ deleted: true });
}

// --- Schedules ---
async function _setWorkerSchedule(ctx: AuthContext, input: SetWorkerScheduleInput): Promise<ActionResult<WorkerScheduleModel>> {
  const db = getDb();
  const now = nowISO();

  const existing = await db.collection("worker_schedules")
    .where("worker_id", "==", input.worker_id)
    .where("date", "==", input.date)
    .limit(1)
    .get();

  const schedule: WorkerScheduleModel = {
    id: existing.empty ? db.collection("worker_schedules").doc().id : existing.docs[0].id,
    data_creator: existing.empty ? ctx.userId : existing.docs[0].data().data_creator,
    data_updater: ctx.userId,
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
  return ok(schedule);
}

async function _setVehicleSchedule(ctx: AuthContext, input: SetVehicleScheduleInput): Promise<ActionResult<VehicleScheduleModel>> {
  const db = getDb();
  const now = nowISO();

  const existing = await db.collection("vehicle_schedules")
    .where("vehicle_id", "==", input.vehicle_id)
    .where("schedule_date", "==", input.schedule_date)
    .limit(1)
    .get();

  const schedule: VehicleScheduleModel = {
    id: existing.empty ? db.collection("vehicle_schedules").doc().id : existing.docs[0].id,
    data_creator: existing.empty ? ctx.userId : existing.docs[0].data().data_creator,
    data_updater: ctx.userId,
    create_time: existing.empty ? now : existing.docs[0].data().create_time,
    update_time: now,
    vehicle_id: input.vehicle_id,
    company_id: input.company_id,
    schedule_date: input.schedule_date,
    status: input.status,
    maintenance_type: input.maintenance_type ?? null,
  };

  const ref = existing.empty
    ? db.collection("vehicle_schedules").doc(schedule.id)
    : existing.docs[0].ref;
  await ref.set(schedule);
  return ok(schedule);
}

async function _setEquipmentSchedule(ctx: AuthContext, input: SetEquipmentScheduleInput): Promise<ActionResult<EquipmentScheduleModel>> {
  const db = getDb();
  const now = nowISO();

  const existing = await db.collection("equipment_schedules")
    .where("equipment_id", "==", input.equipment_id)
    .where("schedule_date", "==", input.schedule_date)
    .limit(1)
    .get();

  const schedule: EquipmentScheduleModel = {
    id: existing.empty ? db.collection("equipment_schedules").doc().id : existing.docs[0].id,
    data_creator: existing.empty ? ctx.userId : existing.docs[0].data().data_creator,
    data_updater: ctx.userId,
    create_time: existing.empty ? now : existing.docs[0].data().create_time,
    update_time: now,
    equipment_id: input.equipment_id,
    company_id: input.company_id,
    schedule_date: input.schedule_date,
    status: input.status,
    reason: input.reason ?? null,
  };

  const ref = existing.empty
    ? db.collection("equipment_schedules").doc(schedule.id)
    : existing.docs[0].ref;
  await ref.set(schedule);
  return ok(schedule);
}

async function _getWorkerScheduleRange(_ctx: AuthContext, input: GetScheduleRangeInput): Promise<ActionResult<WorkerScheduleModel[]>> {
  const snap = await getDb().collection("worker_schedules")
    .where("worker_id", "==", input.resource_id)
    .where("company_id", "==", input.company_id)
    .where("date", ">=", input.start_date)
    .where("date", "<=", input.end_date)
    .orderBy("date", "asc")
    .get();
  return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkerScheduleModel)));
}

async function _getVehicleScheduleRange(_ctx: AuthContext, input: GetScheduleRangeInput): Promise<ActionResult<VehicleScheduleModel[]>> {
  const snap = await getDb().collection("vehicle_schedules")
    .where("vehicle_id", "==", input.resource_id)
    .where("company_id", "==", input.company_id)
    .where("schedule_date", ">=", input.start_date)
    .where("schedule_date", "<=", input.end_date)
    .orderBy("schedule_date", "asc")
    .get();
  return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() } as VehicleScheduleModel)));
}

async function _getEquipmentScheduleRange(_ctx: AuthContext, input: GetScheduleRangeInput): Promise<ActionResult<EquipmentScheduleModel[]>> {
  const snap = await getDb().collection("equipment_schedules")
    .where("equipment_id", "==", input.resource_id)
    .where("company_id", "==", input.company_id)
    .where("schedule_date", ">=", input.start_date)
    .where("schedule_date", "<=", input.end_date)
    .orderBy("schedule_date", "asc")
    .get();
  return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EquipmentScheduleModel)));
}

export const assignWorkerToJob = withValidation(AssignWorkerToJobSchema, withAuth(SCHED_ROLES, _assignWorkerToJob));
export const unassignWorkerFromJob = withValidation(UnassignWorkerFromJobSchema, withAuth(SCHED_ROLES, _unassignWorkerFromJob));
export const assignVehicleToJob = withValidation(AssignVehicleToJobSchema, withAuth(SCHED_ROLES, _assignVehicleToJob));
export const unassignVehicleFromJob = withValidation(UnassignVehicleFromJobSchema, withAuth(SCHED_ROLES, _unassignVehicleFromJob));
export const allocateEquipmentToJob = withValidation(AllocateEquipmentToJobSchema, withAuth(SCHED_ROLES, _allocateEquipmentToJob));
export const deallocateEquipmentFromJob = withValidation(DeallocateEquipmentFromJobSchema, withAuth(SCHED_ROLES, _deallocateEquipmentFromJob));
export const setWorkerSchedule = withValidation(SetWorkerScheduleSchema, withAuth(SCHED_ROLES, _setWorkerSchedule));
export const setVehicleSchedule = withValidation(SetVehicleScheduleSchema, withAuth(SCHED_ROLES, _setVehicleSchedule));
export const setEquipmentSchedule = withValidation(SetEquipmentScheduleSchema, withAuth(SCHED_ROLES, _setEquipmentSchedule));
export const getWorkerScheduleRange = withValidation(GetScheduleRangeSchema, withAuth(READ_ROLES, _getWorkerScheduleRange));
export const getVehicleScheduleRange = withValidation(GetScheduleRangeSchema, withAuth(READ_ROLES, _getVehicleScheduleRange));
export const getEquipmentScheduleRange = withValidation(GetScheduleRangeSchema, withAuth(READ_ROLES, _getEquipmentScheduleRange));
