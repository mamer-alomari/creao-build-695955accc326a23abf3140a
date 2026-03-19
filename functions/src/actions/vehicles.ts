import { getDb } from "../lib/admin-db";
import { ActionResult, AuthContext, ok, err, nowISO, withAuth, withValidation, assertCompanyOwnership } from "./_base";
import { UserRole } from "../types/enums";
import { VehicleModel } from "../types/models";
import { CreateVehicleInput, UpdateVehicleInput, ListByCompanyInput, GetByIdInput, DeleteByIdInput } from "../types/action-types";
import { CreateVehicleSchema, UpdateVehicleSchema, ListByCompanySchema, GetByIdSchema, DeleteByIdSchema } from "../lib/validators";

const COLLECTION = "vehicles";

async function _createVehicle(ctx: AuthContext, input: CreateVehicleInput): Promise<ActionResult<VehicleModel>> {
  const db = getDb();
  const now = nowISO();
  const ref = db.collection(COLLECTION).doc();

  const vehicle: VehicleModel = {
    id: ref.id,
    data_creator: ctx.userId,
    data_updater: ctx.userId,
    create_time: now,
    update_time: now,
    company_id: input.company_id,
    vehicle_name: input.vehicle_name,
    license_plate: input.license_plate,
    type: input.type,
    capacity_cft: input.capacity_cft ?? null,
  };

  await ref.set(vehicle);
  return ok(vehicle);
}

async function _getVehicle(ctx: AuthContext, input: GetByIdInput): Promise<ActionResult<VehicleModel>> {
  const doc = await getDb().collection(COLLECTION).doc(input.id).get();
  if (!doc.exists) return err("Vehicle not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);
  return ok({ id: doc.id, ...doc.data() } as VehicleModel);
}

async function _updateVehicle(ctx: AuthContext, input: UpdateVehicleInput): Promise<ActionResult<VehicleModel>> {
  const ref = getDb().collection(COLLECTION).doc(input.id);
  const doc = await ref.get();
  if (!doc.exists) return err("Vehicle not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);

  const { id, ...updates } = input;
  const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
  filtered.data_updater = ctx.userId;
  filtered.update_time = nowISO();

  await ref.update(filtered);
  const updated = await ref.get();
  return ok({ id: updated.id, ...updated.data() } as VehicleModel);
}

async function _deleteVehicle(ctx: AuthContext, input: DeleteByIdInput): Promise<ActionResult<{ deleted: boolean }>> {
  const doc = await getDb().collection(COLLECTION).doc(input.id).get();
  if (!doc.exists) return err("Vehicle not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);
  await doc.ref.delete();
  return ok({ deleted: true });
}

async function _listVehiclesByCompany(_ctx: AuthContext, input: ListByCompanyInput): Promise<ActionResult<VehicleModel[]>> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("company_id", "==", input.company_id)
    .get();
  return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() } as VehicleModel)));
}

const MGMT = [UserRole.Manager, UserRole.Admin];
const READ = [UserRole.Foreman, UserRole.Manager, UserRole.Admin];

export const createVehicle = withValidation(CreateVehicleSchema, withAuth(MGMT, _createVehicle));
export const getVehicle = withValidation(GetByIdSchema, withAuth(READ, _getVehicle));
export const updateVehicle = withValidation(UpdateVehicleSchema, withAuth(MGMT, _updateVehicle));
export const deleteVehicle = withValidation(DeleteByIdSchema, withAuth(MGMT, _deleteVehicle));
export const listVehiclesByCompany = withValidation(ListByCompanySchema, withAuth(READ, _listVehiclesByCompany));
