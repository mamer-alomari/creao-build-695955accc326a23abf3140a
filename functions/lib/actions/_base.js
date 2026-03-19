"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.err = err;
exports.withAuth = withAuth;
exports.withValidation = withValidation;
exports.nowISO = nowISO;
exports.assertCompanyOwnership = assertCompanyOwnership;
const enums_1 = require("../types/enums");
function ok(data) {
    return { success: true, data };
}
function err(message) {
    return { success: false, error: message };
}
const ROLE_HIERARCHY = {
    [enums_1.UserRole.Unspecified]: 0,
    [enums_1.UserRole.Customer]: 1,
    [enums_1.UserRole.Worker]: 2,
    [enums_1.UserRole.Foreman]: 3,
    [enums_1.UserRole.Manager]: 4,
    [enums_1.UserRole.Admin]: 5,
};
function withAuth(allowedRoles, fn) {
    return async (ctx, input) => {
        var _a;
        const userLevel = (_a = ROLE_HIERARCHY[ctx.userRole]) !== null && _a !== void 0 ? _a : 0;
        const minLevel = Math.min(...allowedRoles.map((r) => { var _a; return (_a = ROLE_HIERARCHY[r]) !== null && _a !== void 0 ? _a : 0; }));
        if (userLevel < minLevel) {
            return err(`Insufficient permissions. Required: ${allowedRoles.join(", ")}`);
        }
        return fn(ctx, input);
    };
}
function withValidation(schema, fn) {
    return async (ctx, rawInput) => {
        const result = schema.safeParse(rawInput);
        if (!result.success) {
            return err(`Validation error: ${result.error.issues.map((i) => i.message).join(", ")}`);
        }
        return fn(ctx, result.data);
    };
}
function nowISO() {
    return new Date().toISOString();
}
/**
 * Verify that a Firestore document belongs to the expected company.
 * Used by get/update/delete actions to prevent cross-company access.
 */
function assertCompanyOwnership(docData, ctx) {
    const docCompanyId = docData.company_id;
    if (!docCompanyId)
        return null; // no company_id on doc, skip check
    if (ctx.companyId && ctx.companyId !== docCompanyId) {
        return "Access denied: resource belongs to a different company";
    }
    return null; // OK
}
//# sourceMappingURL=_base.js.map