import { getDb } from "../lib/admin-db";
import { classifyJobType } from "../lib/address-utils";
import { ActionResult, AuthContext, ok, err, nowISO, withAuth, withValidation, assertCompanyOwnership } from "./_base";
import { JobStatus, UserRole } from "../types/enums";
import { JobModel } from "../types/models";
import {
  CreateJobInput,
  UpdateJobInput,
  UpdateJobStatusInput,
  ListByCompanyInput,
  GetByIdInput,
  DeleteByIdInput,
  GetJobsByStatusInput,
  GetJobsByDateRangeInput,
  GetJobsByCustomerInput,
} from "../types/action-types";
import {
  CreateJobSchema,
  UpdateJobSchema,
  UpdateJobStatusSchema,
  ListByCompanySchema,
  GetByIdSchema,
  DeleteByIdSchema,
  GetJobsByStatusSchema,
  GetJobsByDateRangeSchema,
  GetJobsByCustomerSchema,
} from "../lib/validators";

const COLLECTION = "jobs";

async function _createJob(ctx: AuthContext, input: CreateJobInput): Promise<ActionResult<JobModel>> {
  const db = getDb();
  const now = nowISO();
  const classification = classifyJobType(input.pickup_address, input.dropoff_address);
  const ref = db.collection(COLLECTION).doc();

  const stops = (input.stops || []).map((s, i) => ({
    ...s,
    id: `stop_${i}`,
    status: "pending" as const,
  }));

  const job: JobModel = {
    id: ref.id,
    data_creator: ctx.userId,
    data_updater: ctx.userId,
    create_time: now,
    update_time: now,
    company_id: input.company_id,
    customer_name: input.customer_name,
    status: JobStatus.Quote,
    scheduled_date: input.scheduled_date,
    pickup_address: input.pickup_address,
    dropoff_address: input.dropoff_address,
    estimated_cost: input.estimated_cost || null,
    distance: input.distance,
    classification: classification || undefined,
    customer_id: input.customer_id,
    inventory_data: input.inventory_data,
    stops: stops.length > 0 ? stops : undefined,
    current_stop_index: stops.length > 0 ? 0 : undefined,
  };

  await ref.set(job);
  return ok(job);
}

async function _getJob(ctx: AuthContext, input: GetByIdInput): Promise<ActionResult<JobModel>> {
  const doc = await getDb().collection(COLLECTION).doc(input.id).get();
  if (!doc.exists) return err("Job not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);
  return ok({ id: doc.id, ...doc.data() } as JobModel);
}

async function _updateJob(ctx: AuthContext, input: UpdateJobInput): Promise<ActionResult<JobModel>> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(input.id);
  const doc = await ref.get();
  if (!doc.exists) return err("Job not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);

  const { id, ...updates } = input;
  const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
  filtered.data_updater = ctx.userId;
  filtered.update_time = nowISO();

  if (filtered.pickup_address || filtered.dropoff_address) {
    const existing = doc.data()!;
    const pickup = (filtered.pickup_address as string) || existing.pickup_address;
    const dropoff = (filtered.dropoff_address as string) || existing.dropoff_address;
    const cls = classifyJobType(pickup, dropoff);
    if (cls) filtered.classification = cls;
  }

  await ref.update(filtered);
  const updated = await ref.get();
  return ok({ id: updated.id, ...updated.data() } as JobModel);
}

async function _deleteJob(ctx: AuthContext, input: DeleteByIdInput): Promise<ActionResult<{ deleted: boolean }>> {
  const doc = await getDb().collection(COLLECTION).doc(input.id).get();
  if (!doc.exists) return err("Job not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);
  await doc.ref.delete();
  return ok({ deleted: true });
}

async function _listJobsByCompany(_ctx: AuthContext, input: ListByCompanyInput): Promise<ActionResult<JobModel[]>> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("company_id", "==", input.company_id)
    .orderBy("scheduled_date", "desc")
    .get();
  return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobModel)));
}

async function _getJobsByStatus(_ctx: AuthContext, input: GetJobsByStatusInput): Promise<ActionResult<JobModel[]>> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("company_id", "==", input.company_id)
    .where("status", "==", input.status)
    .get();
  return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobModel)));
}

async function _getJobsByDateRange(_ctx: AuthContext, input: GetJobsByDateRangeInput): Promise<ActionResult<JobModel[]>> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("company_id", "==", input.company_id)
    .where("scheduled_date", ">=", input.start_date)
    .where("scheduled_date", "<=", input.end_date)
    .orderBy("scheduled_date", "asc")
    .get();
  return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobModel)));
}

async function _updateJobStatus(ctx: AuthContext, input: UpdateJobStatusInput): Promise<ActionResult<JobModel>> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(input.id);
  const doc = await ref.get();
  if (!doc.exists) return err("Job not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);
  await ref.update({ status: input.status, data_updater: ctx.userId, update_time: nowISO() });
  const updated = await ref.get();
  return ok({ id: updated.id, ...updated.data() } as JobModel);
}

async function _getJobsByCustomer(_ctx: AuthContext, input: GetJobsByCustomerInput): Promise<ActionResult<JobModel[]>> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("company_id", "==", input.company_id)
    .where("customer_name", "==", input.customer_name)
    .get();
  return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobModel)));
}

const WRITE_ROLES = [UserRole.Foreman, UserRole.Manager, UserRole.Admin];
const READ_ROLES = [UserRole.Worker, UserRole.Foreman, UserRole.Manager, UserRole.Admin];

export const createJob = withValidation(CreateJobSchema, withAuth(WRITE_ROLES, _createJob));
export const getJob = withValidation(GetByIdSchema, withAuth(READ_ROLES, _getJob));
export const updateJob = withValidation(UpdateJobSchema, withAuth(WRITE_ROLES, _updateJob));
export const deleteJob = withValidation(DeleteByIdSchema, withAuth([UserRole.Manager, UserRole.Admin], _deleteJob));
export const listJobsByCompany = withValidation(ListByCompanySchema, withAuth(READ_ROLES, _listJobsByCompany));
export const getJobsByStatus = withValidation(GetJobsByStatusSchema, withAuth(READ_ROLES, _getJobsByStatus));
export const getJobsByDateRange = withValidation(GetJobsByDateRangeSchema, withAuth(READ_ROLES, _getJobsByDateRange));
export const updateJobStatus = withValidation(UpdateJobStatusSchema, withAuth(WRITE_ROLES, _updateJobStatus));
export const getJobsByCustomer = withValidation(GetJobsByCustomerSchema, withAuth(READ_ROLES, _getJobsByCustomer));
