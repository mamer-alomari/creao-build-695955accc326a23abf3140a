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
exports.updateCompany = exports.getCompany = void 0;
const admin_db_1 = require("../lib/admin-db");
const _base_1 = require("./_base");
const enums_1 = require("../types/enums");
const validators_1 = require("../lib/validators");
const COLLECTION = "companies";
async function _getCompany(ctx, input) {
    const doc = await (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id).get();
    if (!doc.exists)
        return (0, _base_1.err)("Company not found");
    // Company docs: the doc id IS the company_id, so check ctx.companyId against doc id
    if (ctx.companyId && ctx.companyId !== doc.id) {
        return (0, _base_1.err)("Access denied: resource belongs to a different company");
    }
    return (0, _base_1.ok)(Object.assign({ id: doc.id }, doc.data()));
}
async function _updateCompany(ctx, input) {
    const ref = (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id);
    const doc = await ref.get();
    if (!doc.exists)
        return (0, _base_1.err)("Company not found");
    if (ctx.companyId && ctx.companyId !== doc.id) {
        return (0, _base_1.err)("Access denied: resource belongs to a different company");
    }
    const { id } = input, updates = __rest(input, ["id"]);
    const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    filtered.data_updater = ctx.userId;
    filtered.update_time = (0, _base_1.nowISO)();
    await ref.update(filtered);
    const updated = await ref.get();
    return (0, _base_1.ok)(Object.assign({ id: updated.id }, updated.data()));
}
const MGMT = [enums_1.UserRole.Manager, enums_1.UserRole.Admin];
const READ = [enums_1.UserRole.Worker, enums_1.UserRole.Foreman, enums_1.UserRole.Manager, enums_1.UserRole.Admin];
exports.getCompany = (0, _base_1.withValidation)(validators_1.GetByIdSchema, (0, _base_1.withAuth)(READ, _getCompany));
exports.updateCompany = (0, _base_1.withValidation)(validators_1.UpdateCompanySchema, (0, _base_1.withAuth)(MGMT, _updateCompany));
//# sourceMappingURL=company.js.map