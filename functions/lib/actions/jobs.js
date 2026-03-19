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
exports.getJobsByCustomer = exports.updateJobStatus = exports.getJobsByDateRange = exports.getJobsByStatus = exports.listJobsByCompany = exports.deleteJob = exports.updateJob = exports.getJob = exports.createJob = void 0;
const admin_db_1 = require("../lib/admin-db");
const address_utils_1 = require("../lib/address-utils");
const _base_1 = require("./_base");
const enums_1 = require("../types/enums");
const validators_1 = require("../lib/validators");
const COLLECTION = "jobs";
async function _createJob(ctx, input) {
    const db = (0, admin_db_1.getDb)();
    const now = (0, _base_1.nowISO)();
    const classification = (0, address_utils_1.classifyJobType)(input.pickup_address, input.dropoff_address);
    const ref = db.collection(COLLECTION).doc();
    const stops = (input.stops || []).map((s, i) => (Object.assign(Object.assign({}, s), { id: `stop_${i}`, status: "pending" })));
    const job = {
        id: ref.id,
        data_creator: ctx.userId,
        data_updater: ctx.userId,
        create_time: now,
        update_time: now,
        company_id: input.company_id,
        customer_name: input.customer_name,
        status: enums_1.JobStatus.Quote,
        scheduled_date: input.scheduled_date,
        pickup_address: input.pickup_address,
        dropoff_address: input.dropoff_address,
        estimated_cost: input.estimated_cost || null,
        distance: input.distance,
        classification: classification || undefined,
        customer_id: input.customer_id,
        inventory_data: input.inventory_data,
        stops: stops.length > 0 ? stops : undefined,
        current_stop_index: stops.length > 0 ? 0 : undefined,
    };
    await ref.set(job);
    return (0, _base_1.ok)(job);
}
async function _getJob(_ctx, input) {
    const doc = await (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id).get();
    if (!doc.exists)
        return (0, _base_1.err)("Job not found");
    return (0, _base_1.ok)(Object.assign({ id: doc.id }, doc.data()));
}
async function _updateJob(ctx, input) {
    const db = (0, admin_db_1.getDb)();
    const ref = db.collection(COLLECTION).doc(input.id);
    const doc = await ref.get();
    if (!doc.exists)
        return (0, _base_1.err)("Job not found");
    const { id } = input, updates = __rest(input, ["id"]);
    const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    filtered.data_updater = ctx.userId;
    filtered.update_time = (0, _base_1.nowISO)();
    if (filtered.pickup_address || filtered.dropoff_address) {
        const existing = doc.data();
        const pickup = filtered.pickup_address || existing.pickup_address;
        const dropoff = filtered.dropoff_address || existing.dropoff_address;
        const cls = (0, address_utils_1.classifyJobType)(pickup, dropoff);
        if (cls)
            filtered.classification = cls;
    }
    await ref.update(filtered);
    const updated = await ref.get();
    return (0, _base_1.ok)(Object.assign({ id: updated.id }, updated.data()));
}
async function _deleteJob(_ctx, input) {
    await (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id).delete();
    return (0, _base_1.ok)({ deleted: true });
}
async function _listJobsByCompany(_ctx, input) {
    const snap = await (0, admin_db_1.getDb)()
        .collection(COLLECTION)
        .where("company_id", "==", input.company_id)
        .orderBy("scheduled_date", "desc")
        .get();
    const jobs = snap.docs.map((d) => (Object.assign({ id: d.id }, d.data())));
    return (0, _base_1.ok)(jobs);
}
async function _getJobsByStatus(_ctx, input) {
    const snap = await (0, admin_db_1.getDb)()
        .collection(COLLECTION)
        .where("company_id", "==", input.company_id)
        .where("status", "==", input.status)
        .get();
    return (0, _base_1.ok)(snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))));
}
async function _getJobsByDateRange(_ctx, input) {
    const snap = await (0, admin_db_1.getDb)()
        .collection(COLLECTION)
        .where("company_id", "==", input.company_id)
        .where("scheduled_date", ">=", input.start_date)
        .where("scheduled_date", "<=", input.end_date)
        .orderBy("scheduled_date", "asc")
        .get();
    return (0, _base_1.ok)(snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))));
}
async function _updateJobStatus(ctx, input) {
    const db = (0, admin_db_1.getDb)();
    const ref = db.collection(COLLECTION).doc(input.id);
    const doc = await ref.get();
    if (!doc.exists)
        return (0, _base_1.err)("Job not found");
    await ref.update({ status: input.status, data_updater: ctx.userId, update_time: (0, _base_1.nowISO)() });
    const updated = await ref.get();
    return (0, _base_1.ok)(Object.assign({ id: updated.id }, updated.data()));
}
async function _getJobsByCustomer(_ctx, input) {
    const snap = await (0, admin_db_1.getDb)()
        .collection(COLLECTION)
        .where("company_id", "==", input.company_id)
        .where("customer_name", "==", input.customer_name)
        .get();
    return (0, _base_1.ok)(snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))));
}
const WRITE_ROLES = [enums_1.WorkerRole.Foreman, enums_1.WorkerRole.Manager, enums_1.WorkerRole.Admin];
const READ_ROLES = [enums_1.WorkerRole.Worker, enums_1.WorkerRole.Foreman, enums_1.WorkerRole.Manager, enums_1.WorkerRole.Admin];
exports.createJob = (0, _base_1.withValidation)(validators_1.CreateJobSchema, (0, _base_1.withAuth)(WRITE_ROLES, _createJob));
exports.getJob = (0, _base_1.withValidation)(validators_1.GetByIdSchema, (0, _base_1.withAuth)(READ_ROLES, _getJob));
exports.updateJob = (0, _base_1.withValidation)(validators_1.UpdateJobSchema, (0, _base_1.withAuth)(WRITE_ROLES, _updateJob));
exports.deleteJob = (0, _base_1.withValidation)(validators_1.DeleteByIdSchema, (0, _base_1.withAuth)([enums_1.WorkerRole.Manager, enums_1.WorkerRole.Admin], _deleteJob));
exports.listJobsByCompany = (0, _base_1.withValidation)(validators_1.ListByCompanySchema, (0, _base_1.withAuth)(READ_ROLES, _listJobsByCompany));
exports.getJobsByStatus = (0, _base_1.withValidation)(validators_1.GetJobsByStatusSchema, (0, _base_1.withAuth)(READ_ROLES, _getJobsByStatus));
exports.getJobsByDateRange = (0, _base_1.withValidation)(validators_1.GetJobsByDateRangeSchema, (0, _base_1.withAuth)(READ_ROLES, _getJobsByDateRange));
exports.updateJobStatus = (0, _base_1.withValidation)(validators_1.UpdateJobStatusSchema, (0, _base_1.withAuth)(WRITE_ROLES, _updateJobStatus));
exports.getJobsByCustomer = (0, _base_1.withValidation)(validators_1.GetJobsByCustomerSchema, (0, _base_1.withAuth)(READ_ROLES, _getJobsByCustomer));
//# sourceMappingURL=jobs.js.map