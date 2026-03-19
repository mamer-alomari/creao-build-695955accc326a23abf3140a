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
exports.listIncidentsByCompany = exports.updateIncident = exports.getIncident = exports.createIncident = void 0;
const admin_db_1 = require("../lib/admin-db");
const _base_1 = require("./_base");
const enums_1 = require("../types/enums");
const validators_1 = require("../lib/validators");
const COLLECTION = "incidents";
async function _createIncident(ctx, input) {
    const db = (0, admin_db_1.getDb)();
    const now = (0, _base_1.nowISO)();
    const ref = db.collection(COLLECTION).doc();
    const incident = {
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
    await ref.set(Object.assign(Object.assign({}, incident), { data_creator: ctx.userId, data_updater: ctx.userId, update_time: now }));
    return (0, _base_1.ok)(incident);
}
async function _getIncident(ctx, input) {
    const doc = await (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id).get();
    if (!doc.exists)
        return (0, _base_1.err)("Incident not found");
    const ownerErr = (0, _base_1.assertCompanyOwnership)(doc.data(), ctx);
    if (ownerErr)
        return (0, _base_1.err)(ownerErr);
    return (0, _base_1.ok)(Object.assign({ id: doc.id }, doc.data()));
}
async function _updateIncident(ctx, input) {
    const ref = (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id);
    const doc = await ref.get();
    if (!doc.exists)
        return (0, _base_1.err)("Incident not found");
    const ownerErr = (0, _base_1.assertCompanyOwnership)(doc.data(), ctx);
    if (ownerErr)
        return (0, _base_1.err)(ownerErr);
    const { id } = input, updates = __rest(input, ["id"]);
    const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    filtered.data_updater = ctx.userId;
    filtered.update_time = (0, _base_1.nowISO)();
    await ref.update(filtered);
    const updated = await ref.get();
    return (0, _base_1.ok)(Object.assign({ id: updated.id }, updated.data()));
}
async function _listIncidentsByCompany(_ctx, input) {
    const snap = await (0, admin_db_1.getDb)()
        .collection(COLLECTION)
        .where("company_id", "==", input.company_id)
        .orderBy("create_time", "desc")
        .get();
    return (0, _base_1.ok)(snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))));
}
const WRITE = [enums_1.UserRole.Worker, enums_1.UserRole.Foreman, enums_1.UserRole.Manager, enums_1.UserRole.Admin];
const READ = [enums_1.UserRole.Foreman, enums_1.UserRole.Manager, enums_1.UserRole.Admin];
exports.createIncident = (0, _base_1.withValidation)(validators_1.CreateIncidentSchema, (0, _base_1.withAuth)(WRITE, _createIncident));
exports.getIncident = (0, _base_1.withValidation)(validators_1.GetByIdSchema, (0, _base_1.withAuth)(READ, _getIncident));
exports.updateIncident = (0, _base_1.withValidation)(validators_1.UpdateIncidentSchema, (0, _base_1.withAuth)(READ, _updateIncident));
exports.listIncidentsByCompany = (0, _base_1.withValidation)(validators_1.ListByCompanySchema, (0, _base_1.withAuth)(READ, _listIncidentsByCompany));
//# sourceMappingURL=incidents.js.map