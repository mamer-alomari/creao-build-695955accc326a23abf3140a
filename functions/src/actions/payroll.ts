import { getDb } from "../lib/admin-db";
import { ActionResult, AuthContext, ok, err, nowISO, withAuth, withValidation, assertCompanyOwnership } from "./_base";
import { UserRole, PayrollRecordStatus } from "../types/enums";
import { PayrollRecordModel } from "../types/models";
import { CreatePayrollRecordInput, UpdatePayrollRecordInput, ListByCompanyInput, GetByIdInput, DeleteByIdInput } from "../types/action-types";
import { CreatePayrollRecordSchema, UpdatePayrollRecordSchema, ListByCompanySchema, GetByIdSchema, DeleteByIdSchema } from "../lib/validators";

const COLLECTION = "payroll_records";

async function _createPayrollRecord(ctx: AuthContext, input: CreatePayrollRecordInput): Promise<ActionResult<PayrollRecordModel>> {
  const db = getDb();
  const now = nowISO();
  const ref = db.collection(COLLECTION).doc();

  const record: PayrollRecordModel = {
    id: ref.id,
    data_creator: ctx.userId,
    data_updater: ctx.userId,
    create_time: now,
    update_time: now,
    worker_id: input.worker_id,
    company_id: input.company_id,
    pay_period_start: input.pay_period_start,
    pay_period_end: input.pay_period_end,
    hourly_wage: input.hourly_wage,
    hours_worked: input.hours_worked,
    total_pay: Math.round(input.hourly_wage * input.hours_worked * 100) / 100,
    status: PayrollRecordStatus.Draft,
  };

  await ref.set(record);
  return ok(record);
}

async function _getPayrollRecord(ctx: AuthContext, input: GetByIdInput): Promise<ActionResult<PayrollRecordModel>> {
  const doc = await getDb().collection(COLLECTION).doc(input.id).get();
  if (!doc.exists) return err("Payroll record not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);
  return ok({ id: doc.id, ...doc.data() } as PayrollRecordModel);
}

async function _updatePayrollRecord(ctx: AuthContext, input: UpdatePayrollRecordInput): Promise<ActionResult<PayrollRecordModel>> {
  const ref = getDb().collection(COLLECTION).doc(input.id);
  const doc = await ref.get();
  if (!doc.exists) return err("Payroll record not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);

  const existing = doc.data()!;
  const { id, ...updates } = input;
  const filtered: Record<string, any> = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  );
  filtered.data_updater = ctx.userId;
  filtered.update_time = nowISO();

  const wage = (filtered.hourly_wage as number) ?? existing.hourly_wage;
  const hours = (filtered.hours_worked as number) ?? existing.hours_worked;
  filtered.total_pay = Math.round(wage * hours * 100) / 100;

  await ref.update(filtered);
  const updated = await ref.get();
  return ok({ id: updated.id, ...updated.data() } as PayrollRecordModel);
}

async function _deletePayrollRecord(ctx: AuthContext, input: DeleteByIdInput): Promise<ActionResult<{ deleted: boolean }>> {
  const doc = await getDb().collection(COLLECTION).doc(input.id).get();
  if (!doc.exists) return err("Payroll record not found");
  const ownerErr = assertCompanyOwnership(doc.data()!, ctx);
  if (ownerErr) return err(ownerErr);
  await doc.ref.delete();
  return ok({ deleted: true });
}

async function _listPayrollByCompany(_ctx: AuthContext, input: ListByCompanyInput): Promise<ActionResult<PayrollRecordModel[]>> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("company_id", "==", input.company_id)
    .orderBy("pay_period_start", "desc")
    .get();
  return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PayrollRecordModel)));
}

const MGMT = [UserRole.Manager, UserRole.Admin];

export const createPayrollRecord = withValidation(CreatePayrollRecordSchema, withAuth(MGMT, _createPayrollRecord));
export const getPayrollRecord = withValidation(GetByIdSchema, withAuth(MGMT, _getPayrollRecord));
export const updatePayrollRecord = withValidation(UpdatePayrollRecordSchema, withAuth(MGMT, _updatePayrollRecord));
export const deletePayrollRecord = withValidation(DeleteByIdSchema, withAuth(MGMT, _deletePayrollRecord));
export const listPayrollByCompany = withValidation(ListByCompanySchema, withAuth(MGMT, _listPayrollByCompany));
