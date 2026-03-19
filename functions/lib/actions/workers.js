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
exports.listWorkersByCompany = exports.deleteWorker = exports.updateWorker = exports.getWorker = exports.createWorker = void 0;
const admin_db_1 = require("../lib/admin-db");
const _base_1 = require("./_base");
const enums_1 = require("../types/enums");
const validators_1 = require("../lib/validators");
const COLLECTION = "workers";
async function _createWorker(ctx, input) {
    var _a;
    const db = (0, admin_db_1.getDb)();
    const now = (0, _base_1.nowISO)();
    const ref = db.collection(COLLECTION).doc();
    const worker = {
        id: ref.id,
        data_creator: ctx.userId,
        data_updater: ctx.userId,
        create_time: now,
        update_time: now,
        full_name: input.full_name,
        role: input.role,
        status: (_a = input.status) !== null && _a !== void 0 ? _a : enums_1.WorkerStatus.Active,
        company_id: input.company_id,
        hourly_rate: input.hourly_rate,
        email: input.email,
        phone_number: input.phone_number,
        can_self_schedule: input.can_self_schedule,
    };
    await ref.set(worker);
    return (0, _base_1.ok)(worker);
}
async function _getWorker(_ctx, input) {
    const doc = await (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id).get();
    if (!doc.exists)
        return (0, _base_1.err)("Worker not found");
    return (0, _base_1.ok)(Object.assign({ id: doc.id }, doc.data()));
}
async function _updateWorker(ctx, input) {
    const ref = (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id);
    const doc = await ref.get();
    if (!doc.exists)
        return (0, _base_1.err)("Worker not found");
    const { id } = input, updates = __rest(input, ["id"]);
    const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    filtered.data_updater = ctx.userId;
    filtered.update_time = (0, _base_1.nowISO)();
    await ref.update(filtered);
    const updated = await ref.get();
    return (0, _base_1.ok)(Object.assign({ id: updated.id }, updated.data()));
}
async function _deleteWorker(_ctx, input) {
    await (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id).delete();
    return (0, _base_1.ok)({ deleted: true });
}
async function _listWorkersByCompany(_ctx, input) {
    const snap = await (0, admin_db_1.getDb)()
        .collection(COLLECTION)
        .where("company_id", "==", input.company_id)
        .get();
    return (0, _base_1.ok)(snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))));
}
const MGMT = [enums_1.WorkerRole.Manager, enums_1.WorkerRole.Admin];
const READ = [enums_1.WorkerRole.Foreman, enums_1.WorkerRole.Manager, enums_1.WorkerRole.Admin];
exports.createWorker = (0, _base_1.withValidation)(validators_1.CreateWorkerSchema, (0, _base_1.withAuth)(MGMT, _createWorker));
exports.getWorker = (0, _base_1.withValidation)(validators_1.GetByIdSchema, (0, _base_1.withAuth)(READ, _getWorker));
exports.updateWorker = (0, _base_1.withValidation)(validators_1.UpdateWorkerSchema, (0, _base_1.withAuth)(MGMT, _updateWorker));
exports.deleteWorker = (0, _base_1.withValidation)(validators_1.DeleteByIdSchema, (0, _base_1.withAuth)(MGMT, _deleteWorker));
exports.listWorkersByCompany = (0, _base_1.withValidation)(validators_1.ListByCompanySchema, (0, _base_1.withAuth)(READ, _listWorkersByCompany));
//# sourceMappingURL=workers.js.map