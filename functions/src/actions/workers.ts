import { getDb } from "../lib/admin-db";
import { ActionResult, AuthContext, ok, err, nowISO, withAuth, withValidation, assertCompanyOwnership } from "./_base";
import { UserRole, WorkerStatus } from "../types/enums";
import { WorkerModel } from "../types/models";
import { CreateWorkerInput, UpdateWorkerInput, ListByCompanyInput, GetByIdInput, DeleteByIdInput } from "../types/action-types";
import { CreateWorkerSchema, UpdateWorkerSchema, ListByCompanySchema, GetByIdSchema, DeleteByIdSchema } from "../lib/validators";

const COLLECTION = "workers";

async function _createWorker(ctx: AuthContext, input: CreateWorkerInput): Promise<ActionResult<WorkerModel>> {
  const db = getDb();
  const now = nowISO();
  const ref = db.collection(COLLECTION).doc();

  const worker: WorkerModel = {
    id: ref.id,
    data_creator: ctx.userId,
    data_updater: ctx.userId,
    create_time: now,
    update_time: now,
    full_name: input.full_name,
    role: input.role,
    status: input.status ?? WorkerStatus.Active,
    company_id: input.company_id,
    hourly_rate: input.hourly_rate,
    email: input.email,
    phone_number: input.phone_number,
    can_self_schedule: input.can_self_schedule,
  };

  await ref.set(worker);
  return ok(worker);
}

async function _getWorker(ctx: AuthContext, input: GetByIdInput): Promise<ActionResult<WorkerModel>> {
  const doc = await getDb().collection(COLLECTION).doc(input.id).get();
  if (!doc.exists) return err("Worker not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);
  return ok({ id: doc.id, ...doc.data() } as WorkerModel);
}

async function _updateWorker(ctx: AuthContext, input: UpdateWorkerInput): Promise<ActionResult<WorkerModel>> {
  const ref = getDb().collection(COLLECTION).doc(input.id);
  const doc = await ref.get();
  if (!doc.exists) return err("Worker not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);

  const { id, ...updates } = input;
  const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
  filtered.data_updater = ctx.userId;
  filtered.update_time = nowISO();

  await ref.update(filtered);
  const updated = await ref.get();
  return ok({ id: updated.id, ...updated.data() } as WorkerModel);
}

async function _deleteWorker(ctx: AuthContext, input: DeleteByIdInput): Promise<ActionResult<{ deleted: boolean }>> {
  const doc = await getDb().collection(COLLECTION).doc(input.id).get();
  if (!doc.exists) return err("Worker not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);
  await doc.ref.delete();
  return ok({ deleted: true });
}

async function _listWorkersByCompany(_ctx: AuthContext, input: ListByCompanyInput): Promise<ActionResult<WorkerModel[]>> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("company_id", "==", input.company_id)
    .get();
  return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkerModel)));
}

const MGMT = [UserRole.Manager, UserRole.Admin];
const READ = [UserRole.Foreman, UserRole.Manager, UserRole.Admin];

export const createWorker = withValidation(CreateWorkerSchema, withAuth(MGMT, _createWorker));
export const getWorker = withValidation(GetByIdSchema, withAuth(READ, _getWorker));
export const updateWorker = withValidation(UpdateWorkerSchema, withAuth(MGMT, _updateWorker));
export const deleteWorker = withValidation(DeleteByIdSchema, withAuth(MGMT, _deleteWorker));
export const listWorkersByCompany = withValidation(ListByCompanySchema, withAuth(READ, _listWorkersByCompany));
