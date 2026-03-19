import { getDb } from "../lib/admin-db";
import { ActionResult, AuthContext, ok, err, nowISO, withAuth, withValidation, assertCompanyOwnership } from "./_base";
import { UserRole } from "../types/enums";
import { EquipmentModel } from "../types/models";
import { CreateEquipmentInput, UpdateEquipmentInput, ListByCompanyInput, GetByIdInput, DeleteByIdInput } from "../types/action-types";
import { CreateEquipmentSchema, UpdateEquipmentSchema, ListByCompanySchema, GetByIdSchema, DeleteByIdSchema } from "../lib/validators";

const COLLECTION = "equipment";

async function _createEquipment(ctx: AuthContext, input: CreateEquipmentInput): Promise<ActionResult<EquipmentModel>> {
  const db = getDb();
  const now = nowISO();
  const ref = db.collection(COLLECTION).doc();

  const item: EquipmentModel = {
    id: ref.id,
    data_creator: ctx.userId,
    data_updater: ctx.userId,
    create_time: now,
    update_time: now,
    company_id: input.company_id,
    name: input.name,
    total_quantity: input.total_quantity,
    type: input.type,
    description: input.description ?? null,
  };

  await ref.set(item);
  return ok(item);
}

async function _getEquipment(ctx: AuthContext, input: GetByIdInput): Promise<ActionResult<EquipmentModel>> {
  const doc = await getDb().collection(COLLECTION).doc(input.id).get();
  if (!doc.exists) return err("Equipment not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);
  return ok({ id: doc.id, ...doc.data() } as EquipmentModel);
}

async function _updateEquipment(ctx: AuthContext, input: UpdateEquipmentInput): Promise<ActionResult<EquipmentModel>> {
  const ref = getDb().collection(COLLECTION).doc(input.id);
  const doc = await ref.get();
  if (!doc.exists) return err("Equipment not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);

  const { id, ...updates } = input;
  const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
  filtered.data_updater = ctx.userId;
  filtered.update_time = nowISO();

  await ref.update(filtered);
  const updated = await ref.get();
  return ok({ id: updated.id, ...updated.data() } as EquipmentModel);
}

async function _deleteEquipment(ctx: AuthContext, input: DeleteByIdInput): Promise<ActionResult<{ deleted: boolean }>> {
  const doc = await getDb().collection(COLLECTION).doc(input.id).get();
  if (!doc.exists) return err("Equipment not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);
  await doc.ref.delete();
  return ok({ deleted: true });
}

async function _listEquipmentByCompany(_ctx: AuthContext, input: ListByCompanyInput): Promise<ActionResult<EquipmentModel[]>> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("company_id", "==", input.company_id)
    .get();
  return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EquipmentModel)));
}

const MGMT = [UserRole.Manager, UserRole.Admin];
const READ = [UserRole.Foreman, UserRole.Manager, UserRole.Admin];

export const createEquipment = withValidation(CreateEquipmentSchema, withAuth(MGMT, _createEquipment));
export const getEquipment = withValidation(GetByIdSchema, withAuth(READ, _getEquipment));
export const updateEquipment = withValidation(UpdateEquipmentSchema, withAuth(MGMT, _updateEquipment));
export const deleteEquipment = withValidation(DeleteByIdSchema, withAuth(MGMT, _deleteEquipment));
export const listEquipmentByCompany = withValidation(ListByCompanySchema, withAuth(READ, _listEquipmentByCompany));
