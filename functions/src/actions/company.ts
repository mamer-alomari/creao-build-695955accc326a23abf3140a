import { getDb } from "../lib/admin-db";
import { ActionResult, AuthContext, ok, err, nowISO, withAuth, withValidation } from "./_base";
import { UserRole } from "../types/enums";
import { CompanyModel } from "../types/models";
import { GetByIdInput, UpdateCompanyInput } from "../types/action-types";
import { GetByIdSchema, UpdateCompanySchema } from "../lib/validators";

const COLLECTION = "companies";

async function _getCompany(ctx: AuthContext, input: GetByIdInput): Promise<ActionResult<CompanyModel>> {
  const doc = await getDb().collection(COLLECTION).doc(input.id).get();
  if (!doc.exists) return err("Company not found");
  // Company docs: the doc id IS the company_id, so check ctx.companyId against doc id
  if (ctx.companyId && ctx.companyId !== doc.id) {
    return err("Access denied: resource belongs to a different company");
  }
  return ok({ id: doc.id, ...doc.data() } as CompanyModel);
}

async function _updateCompany(ctx: AuthContext, input: UpdateCompanyInput): Promise<ActionResult<CompanyModel>> {
  const ref = getDb().collection(COLLECTION).doc(input.id);
  const doc = await ref.get();
  if (!doc.exists) return err("Company not found");
  if (ctx.companyId && ctx.companyId !== doc.id) {
    return err("Access denied: resource belongs to a different company");
  }

  const { id, ...updates } = input;
  const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
  filtered.data_updater = ctx.userId;
  filtered.update_time = nowISO();

  await ref.update(filtered);
  const updated = await ref.get();
  return ok({ id: updated.id, ...updated.data() } as CompanyModel);
}

const MGMT = [UserRole.Manager, UserRole.Admin];
const READ = [UserRole.Worker, UserRole.Foreman, UserRole.Manager, UserRole.Admin];

export const getCompany = withValidation(GetByIdSchema, withAuth(READ, _getCompany));
export const updateCompany = withValidation(UpdateCompanySchema, withAuth(MGMT, _updateCompany));
