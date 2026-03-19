import { getDb } from "../lib/admin-db";
import { ActionResult, AuthContext, ok, err, nowISO, withAuth, withValidation } from "./_base";
import { WorkerRole } from "../types/enums";
import { InvitationModel } from "../types/models";
import { CreateInvitationInput, UpdateInvitationStatusInput, ListByCompanyInput } from "../types/action-types";
import { CreateInvitationSchema, UpdateInvitationStatusSchema, ListByCompanySchema } from "../lib/validators";

const COLLECTION = "invitations";

async function _createInvitation(ctx: AuthContext, input: CreateInvitationInput): Promise<ActionResult<InvitationModel>> {
  const db = getDb();
  const now = nowISO();
  const ref = db.collection(COLLECTION).doc();

  // Default expiry: 7 days from now
  const defaultExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const invitation: InvitationModel = {
    id: ref.id,
    email: input.email,
    name: input.name,
    phone_number: input.phone_number,
    role: input.role,
    company_id: input.company_id,
    status: "pending",
    create_time: now,
    expires_at: input.expires_at || defaultExpiry,
    created_by: ctx.userId,
  };

  await ref.set(invitation);
  return ok(invitation);
}

async function _updateInvitationStatus(_ctx: AuthContext, input: UpdateInvitationStatusInput): Promise<ActionResult<InvitationModel>> {
  const ref = getDb().collection(COLLECTION).doc(input.id);
  const doc = await ref.get();
  if (!doc.exists) return err("Invitation not found");

  await ref.update({ status: input.status });
  const updated = await ref.get();
  return ok({ id: updated.id, ...updated.data() } as InvitationModel);
}

async function _listInvitationsByCompany(_ctx: AuthContext, input: ListByCompanyInput): Promise<ActionResult<InvitationModel[]>> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("company_id", "==", input.company_id)
    .orderBy("create_time", "desc")
    .get();
  return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() } as InvitationModel)));
}

const MGMT = [WorkerRole.Manager, WorkerRole.Admin];

export const createInvitation = withValidation(CreateInvitationSchema, withAuth(MGMT, _createInvitation));
export const updateInvitationStatus = withValidation(UpdateInvitationStatusSchema, withAuth(MGMT, _updateInvitationStatus));
export const listInvitationsByCompany = withValidation(ListByCompanySchema, withAuth(MGMT, _listInvitationsByCompany));
