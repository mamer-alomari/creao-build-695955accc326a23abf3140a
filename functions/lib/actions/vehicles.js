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
exports.listVehiclesByCompany = exports.deleteVehicle = exports.updateVehicle = exports.getVehicle = exports.createVehicle = void 0;
const admin_db_1 = require("../lib/admin-db");
const _base_1 = require("./_base");
const enums_1 = require("../types/enums");
const validators_1 = require("../lib/validators");
const COLLECTION = "vehicles";
async function _createVehicle(ctx, input) {
    var _a;
    const db = (0, admin_db_1.getDb)();
    const now = (0, _base_1.nowISO)();
    const ref = db.collection(COLLECTION).doc();
    const vehicle = {
        id: ref.id,
        data_creator: ctx.userId,
        data_updater: ctx.userId,
        create_time: now,
        update_time: now,
        company_id: input.company_id,
        vehicle_name: input.vehicle_name,
        license_plate: input.license_plate,
        type: input.type,
        capacity_cft: (_a = input.capacity_cft) !== null && _a !== void 0 ? _a : null,
    };
    await ref.set(vehicle);
    return (0, _base_1.ok)(vehicle);
}
async function _getVehicle(ctx, input) {
    const doc = await (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id).get();
    if (!doc.exists)
        return (0, _base_1.err)("Vehicle not found");
    const ownerErr = (0, _base_1.assertCompanyOwnership)(doc.data(), ctx);
    if (ownerErr)
        return (0, _base_1.err)(ownerErr);
    return (0, _base_1.ok)(Object.assign({ id: doc.id }, doc.data()));
}
async function _updateVehicle(ctx, input) {
    const ref = (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id);
    const doc = await ref.get();
    if (!doc.exists)
        return (0, _base_1.err)("Vehicle not found");
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
async function _deleteVehicle(ctx, input) {
    const doc = await (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id).get();
    if (!doc.exists)
        return (0, _base_1.err)("Vehicle not found");
    const ownerErr = (0, _base_1.assertCompanyOwnership)(doc.data(), ctx);
    if (ownerErr)
        return (0, _base_1.err)(ownerErr);
    await doc.ref.delete();
    return (0, _base_1.ok)({ deleted: true });
}
async function _listVehiclesByCompany(_ctx, input) {
    const snap = await (0, admin_db_1.getDb)()
        .collection(COLLECTION)
        .where("company_id", "==", input.company_id)
        .get();
    return (0, _base_1.ok)(snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))));
}
const MGMT = [enums_1.UserRole.Manager, enums_1.UserRole.Admin];
const READ = [enums_1.UserRole.Foreman, enums_1.UserRole.Manager, enums_1.UserRole.Admin];
exports.createVehicle = (0, _base_1.withValidation)(validators_1.CreateVehicleSchema, (0, _base_1.withAuth)(MGMT, _createVehicle));
exports.getVehicle = (0, _base_1.withValidation)(validators_1.GetByIdSchema, (0, _base_1.withAuth)(READ, _getVehicle));
exports.updateVehicle = (0, _base_1.withValidation)(validators_1.UpdateVehicleSchema, (0, _base_1.withAuth)(MGMT, _updateVehicle));
exports.deleteVehicle = (0, _base_1.withValidation)(validators_1.DeleteByIdSchema, (0, _base_1.withAuth)(MGMT, _deleteVehicle));
exports.listVehiclesByCompany = (0, _base_1.withValidation)(validators_1.ListByCompanySchema, (0, _base_1.withAuth)(READ, _listVehiclesByCompany));
//# sourceMappingURL=vehicles.js.map