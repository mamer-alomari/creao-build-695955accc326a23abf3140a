import { getDb } from "../lib/admin-db";
import { ActionResult, AuthContext, ok, err, nowISO, withAuth, withValidation, assertCompanyOwnership } from "./_base";
import { UserRole } from "../types/enums";
import { IncidentModel } from "../types/models";
import { CreateIncidentInput, UpdateIncidentInput, ListByCompanyInput, GetByIdInput } from "../types/action-types";
import { CreateIncidentSchema, UpdateIncidentSchema, ListByCompanySchema, GetByIdSchema } from "../lib/validators";

const COLLECTION = "incidents";

async function _createIncident(ctx: AuthContext, input: CreateIncidentInput): Promise<ActionResult<IncidentModel>> {
  const db = getDb();
  const now = nowISO();
  const ref = db.collection(COLLECTION).doc();

  const incident: IncidentModel = {
    id: ref.id,
    create_time: now,
    type: input.type,
    description: input.description,
    job_id: input.job_id,
    reported_by: input.reported_by,
    company_id: input.company_id,
    status: "open",
  };

  // Store with audit fields
  await ref.set({ ...incident, data_creator: ctx.userId, data_updater: ctx.userId, update_time: now });
  return ok(incident);
}

async function _getIncident(ctx: AuthContext, input: GetByIdInput): Promise<ActionResult<IncidentModel>> {
  const doc = await getDb().collection(COLLECTION).doc(input.id).get();
  if (!doc.exists) return err("Incident not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);
  return ok({ id: doc.id, ...doc.data() } as IncidentModel);
}

async function _updateIncident(ctx: AuthContext, input: UpdateIncidentInput): Promise<ActionResult<IncidentModel>> {
  const ref = getDb().collection(COLLECTION).doc(input.id);
  const doc = await ref.get();
  if (!doc.exists) return err("Incident not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);

  const { id, ...updates } = input;
  const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
  filtered.data_updater = ctx.userId;
  filtered.update_time = nowISO();

  await ref.update(filtered);
  const updated = await ref.get();
  return ok({ id: updated.id, ...updated.data() } as IncidentModel);
}

async function _listIncidentsByCompany(_ctx: AuthContext, input: ListByCompanyInput): Promise<ActionResult<IncidentModel[]>> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("company_id", "==", input.company_id)
    .orderBy("create_time", "desc")
    .get();
  return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() } as IncidentModel)));
}

const WRITE = [UserRole.Worker, UserRole.Foreman, UserRole.Manager, UserRole.Admin];
const READ = [UserRole.Foreman, UserRole.Manager, UserRole.Admin];

export const createIncident = withValidation(CreateIncidentSchema, withAuth(WRITE, _createIncident));
export const getIncident = withValidation(GetByIdSchema, withAuth(READ, _getIncident));
export const updateIncident = withValidation(UpdateIncidentSchema, withAuth(READ, _updateIncident));
export const listIncidentsByCompany = withValidation(ListByCompanySchema, withAuth(READ, _listIncidentsByCompany));
