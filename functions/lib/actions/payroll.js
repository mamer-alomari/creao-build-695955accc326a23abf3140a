"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPayrollByCompany = exports.deletePayrollRecord = exports.updatePayrollRecord = exports.getPayrollRecord = exports.createPayrollRecord = void 0;
const admin_db_1 = require("../lib/admin-db");
const _base_1 = require("./_base");
const enums_1 = require("../types/enums");
const validators_1 = require("../lib/validators");
const COLLECTION = "payroll_records";
async function _createPayrollRecord(ctx, input) {
    const db = (0, admin_db_1.getDb)();
    const now = (0, _base_1.nowISO)();
    const ref = db.collection(COLLECTION).doc();
    const record = {
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
        status: enums_1.PayrollRecordStatus.Draft,
    };
    await ref.set(record);
    return (0, _base_1.ok)(record);
}
async function _getPayrollRecord(_ctx, input) {
    const doc = await (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id).get();
    if (!doc.exists)
        return (0, _base_1.err)("Payroll record not found");
    return (0, _base_1.ok)(Object.assign({ id: doc.id }, doc.data()));
}
async function _updatePayrollRecord(ctx, input) {
    var _a, _b;
    const ref = (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id);
    const doc = await ref.get();
    if (!doc.exists)
        return (0, _base_1.err)("Payroll record not found");
    const existing = doc.data();
    const { id } = input, updates = __rest(input, ["id"]);
    const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    filtered.data_updater = ctx.userId;
    filtered.update_time = (0, _base_1.nowISO)();
    // Recalculate total_pay if wage or hours changed
    const wage = (_a = filtered.hourly_wage) !== null && _a !== void 0 ? _a : existing.hourly_wage;
    const hours = (_b = filtered.hours_worked) !== null && _b !== void 0 ? _b : existing.hours_worked;
    filtered.total_pay = Math.round(wage * hours * 100) / 100;
    await ref.update(filtered);
    const updated = await ref.get();
    return (0, _base_1.ok)(Object.assign({ id: updated.id }, updated.data()));
}
async function _deletePayrollRecord(_ctx, input) {
    await (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id).delete();
    return (0, _base_1.ok)({ deleted: true });
}
async function _listPayrollByCompany(_ctx, input) {
    const snap = await (0, admin_db_1.getDb)()
        .collection(COLLECTION)
        .where("company_id", "==", input.company_id)
        .orderBy("pay_period_start", "desc")
        .get();
    return (0, _base_1.ok)(snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))));
}
const MGMT = [enums_1.WorkerRole.Manager, enums_1.WorkerRole.Admin];
exports.createPayrollRecord = (0, _base_1.withValidation)(validators_1.CreatePayrollRecordSchema, (0, _base_1.withAuth)(MGMT, _createPayrollRecord));
exports.getPayrollRecord = (0, _base_1.withValidation)(validators_1.GetByIdSchema, (0, _base_1.withAuth)(MGMT, _getPayrollRecord));
exports.updatePayrollRecord = (0, _base_1.withValidation)(validators_1.UpdatePayrollRecordSchema, (0, _base_1.withAuth)(MGMT, _updatePayrollRecord));
exports.deletePayrollRecord = (0, _base_1.withValidation)(validators_1.DeleteByIdSchema, (0, _base_1.withAuth)(MGMT, _deletePayrollRecord));
exports.listPayrollByCompany = (0, _base_1.withValidation)(validators_1.ListByCompanySchema, (0, _base_1.withAuth)(MGMT, _listPayrollByCompany));
//# sourceMappingURL=payroll.js.map