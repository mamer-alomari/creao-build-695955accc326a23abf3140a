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
exports.calculateAIQuoteAction = exports.updateQuoteStatus = exports.listQuotesByCompany = exports.updateQuote = exports.getQuote = exports.createQuote = void 0;
const admin_db_1 = require("../lib/admin-db");
const quote_engine_1 = require("../lib/quote-engine");
const _base_1 = require("./_base");
const enums_1 = require("../types/enums");
const validators_1 = require("../lib/validators");
const COLLECTION = "quotes";
async function _createQuote(ctx, input) {
    const db = (0, admin_db_1.getDb)();
    const now = (0, _base_1.nowISO)();
    const ref = db.collection(COLLECTION).doc();
    const quote = {
        id: ref.id,
        create_time: now,
        update_time: now,
        pickup_address: input.pickup_address,
        dropoff_address: input.dropoff_address,
        move_date: input.move_date,
        inventory_items: input.inventory_items,
        estimated_volume: input.estimated_volume,
        estimated_price_min: input.estimated_price_min,
        estimated_price_max: input.estimated_price_max,
        customer_name: input.customer_name,
        customer_email: input.customer_email,
        customer_phone: input.customer_phone,
        status: "PENDING",
        company_id: input.company_id,
        customer_id: input.customer_id,
        stops: input.stops,
        expires_at: input.expires_at,
    };
    // Store audit-compatible data alongside the quote
    await ref.set(Object.assign(Object.assign({}, quote), { data_creator: ctx.userId, data_updater: ctx.userId }));
    return (0, _base_1.ok)(quote);
}
async function _getQuote(ctx, input) {
    const doc = await (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id).get();
    if (!doc.exists)
        return (0, _base_1.err)("Quote not found");
    const ownerErr = (0, _base_1.assertCompanyOwnership)(doc.data(), ctx);
    if (ownerErr)
        return (0, _base_1.err)(ownerErr);
    return (0, _base_1.ok)(Object.assign({ id: doc.id }, doc.data()));
}
async function _updateQuote(ctx, input) {
    const ref = (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id);
    const doc = await ref.get();
    if (!doc.exists)
        return (0, _base_1.err)("Quote not found");
    const ownerErr = (0, _base_1.assertCompanyOwnership)(doc.data(), ctx);
    if (ownerErr)
        return (0, _base_1.err)(ownerErr);
    const { id } = input, updates = __rest(input, ["id"]);
    const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    filtered.update_time = (0, _base_1.nowISO)();
    filtered.data_updater = ctx.userId;
    await ref.update(filtered);
    const updated = await ref.get();
    return (0, _base_1.ok)(Object.assign({ id: updated.id }, updated.data()));
}
async function _listQuotesByCompany(_ctx, input) {
    const snap = await (0, admin_db_1.getDb)()
        .collection(COLLECTION)
        .where("company_id", "==", input.company_id)
        .orderBy("create_time", "desc")
        .get();
    return (0, _base_1.ok)(snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))));
}
async function _updateQuoteStatus(ctx, input) {
    const ref = (0, admin_db_1.getDb)().collection(COLLECTION).doc(input.id);
    const doc = await ref.get();
    if (!doc.exists)
        return (0, _base_1.err)("Quote not found");
    const ownerErr = (0, _base_1.assertCompanyOwnership)(doc.data(), ctx);
    if (ownerErr)
        return (0, _base_1.err)(ownerErr);
    await ref.update({ status: input.status, update_time: (0, _base_1.nowISO)(), data_updater: ctx.userId });
    const updated = await ref.get();
    return (0, _base_1.ok)(Object.assign({ id: updated.id }, updated.data()));
}
async function _calculateAIQuote(_ctx, input) {
    const breakdown = (0, quote_engine_1.calculateAIQuote)(input.rooms, input.distance, input.classification);
    return (0, _base_1.ok)(breakdown);
}
const WRITE = [enums_1.UserRole.Foreman, enums_1.UserRole.Manager, enums_1.UserRole.Admin];
const READ = [enums_1.UserRole.Worker, enums_1.UserRole.Foreman, enums_1.UserRole.Manager, enums_1.UserRole.Admin, enums_1.UserRole.Customer];
exports.createQuote = (0, _base_1.withValidation)(validators_1.CreateQuoteSchema, (0, _base_1.withAuth)(WRITE, _createQuote));
exports.getQuote = (0, _base_1.withValidation)(validators_1.GetByIdSchema, (0, _base_1.withAuth)(READ, _getQuote));
exports.updateQuote = (0, _base_1.withValidation)(validators_1.UpdateQuoteSchema, (0, _base_1.withAuth)(WRITE, _updateQuote));
exports.listQuotesByCompany = (0, _base_1.withValidation)(validators_1.ListByCompanySchema, (0, _base_1.withAuth)(READ, _listQuotesByCompany));
exports.updateQuoteStatus = (0, _base_1.withValidation)(validators_1.UpdateQuoteStatusSchema, (0, _base_1.withAuth)(WRITE, _updateQuoteStatus));
exports.calculateAIQuoteAction = (0, _base_1.withValidation)(validators_1.CalculateAIQuoteSchema, (0, _base_1.withAuth)(READ, _calculateAIQuote));
//# sourceMappingURL=quotes.js.map