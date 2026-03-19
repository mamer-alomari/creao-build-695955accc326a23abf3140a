"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listInvitationsByCompany = exports.updateInvitationStatus = exports.createInvitation = void 0;
const admin_db_1 = require("../lib/admin-db");
const _base_1 = require("./_base");
const enums_1 = require("../types/enums");
const validators_1 = require("../lib/validators");
const COLLECTION = "invitations";
async function _createInvitation(ctx, input) {
    const db = (0, admin_db_1.getDb)();
    const now = (0, _base_1.nowISO)();
    const ref = db.collection(COLLECTION).doc();
    const defaultExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const invitation = {
        id: ref.id,
        email: input.email,
        name: input.name,
        phone_number: input.phone_number,
        role: input.role,
        company_id: input.company_id,
        status: "pending",
        create_time: now,
        expires_at: input.expires_at || defaultExpiry,
        created_by: ctx.userId,
    };
    await ref.set(invitation);
    return (0, _base_1.ok)(invitation);
}
async function _updateInvitationStatus(ctx, input) {
    const ref = (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id);
    const doc = await ref.get();
    if (!doc.exists)
        return (0, _base_1.err)("Invitation not found");
    const ownerErr = (0, _base_1.assertCompanyOwnership)(doc.data(), ctx);
    if (ownerErr)
        return (0, _base_1.err)(ownerErr);
    await ref.update({ status: input.status, update_time: (0, _base_1.nowISO)() });
    const updated = await ref.get();
    return (0, _base_1.ok)(Object.assign({ id: updated.id }, updated.data()));
}
async function _listInvitationsByCompany(_ctx, input) {
    const snap = await (0, admin_db_1.getDb)()
        .collection(COLLECTION)
        .where("company_id", "==", input.company_id)
        .orderBy("create_time", "desc")
        .get();
    return (0, _base_1.ok)(snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))));
}
const MGMT = [enums_1.UserRole.Manager, enums_1.UserRole.Admin];
exports.createInvitation = (0, _base_1.withValidation)(validators_1.CreateInvitationSchema, (0, _base_1.withAuth)(MGMT, _createInvitation));
exports.updateInvitationStatus = (0, _base_1.withValidation)(validators_1.UpdateInvitationStatusSchema, (0, _base_1.withAuth)(MGMT, _updateInvitationStatus));
exports.listInvitationsByCompany = (0, _base_1.withValidation)(validators_1.ListByCompanySchema, (0, _base_1.withAuth)(MGMT, _listInvitationsByCompany));
//# sourceMappingURL=invitations.js.map