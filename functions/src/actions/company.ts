import { getDb } from "../lib/admin-db";
import { ActionResult, AuthContext, ok, err, nowISO, withAuth, withValidation } from "./_base";
import { WorkerRole } from "../types/enums";
import { CompanyModel } from "../types/models";
import { GetByIdInput, UpdateCompanyInput } from "../types/action-types";
import { GetByIdSchema, UpdateCompanySchema } from "../lib/validators";

const COLLECTION = "companies";

async function _getCompany(_ctx: AuthContext, input: GetByIdInput): Promise<ActionResult<CompanyModel>> {
  const doc = await getDb().collection(COLLECTION).doc(input.id).get();
  if (!doc.exists) return err("Company not found");
  return ok({ id: doc.id, ...doc.data() } as CompanyModel);
}

async function _updateCompany(ctx: AuthContext, input: UpdateCompanyInput): Promise<ActionResult<CompanyModel>> {
  const ref = getDb().collection(COLLECTION).doc(input.id);
  const doc = await ref.get();
  if (!doc.exists) return err("Company not found");

  const { id, ...updates } = input;
  const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
  filtered.data_updater = ctx.userId;
  filtered.update_time = nowISO();

  await ref.update(filtered);
  const updated = await ref.get();
  return ok({ id: updated.id, ...updated.data() } as CompanyModel);
}

const MGMT = [WorkerRole.Manager, WorkerRole.Admin];
const READ = [WorkerRole.Worker, WorkerRole.Foreman, WorkerRole.Manager, WorkerRole.Admin];

export const getCompany = withValidation(GetByIdSchema, withAuth(READ, _getCompany));
export const updateCompany = withValidation(UpdateCompanySchema, withAuth(MGMT, _updateCompany));
