"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.err = err;
exports.withAuth = withAuth;
exports.withValidation = withValidation;
exports.nowISO = nowISO;
const enums_1 = require("../types/enums");
function ok(data) {
    return { success: true, data };
}
function err(message) {
    return { success: false, error: message };
}
const ROLE_HIERARCHY = {
    [enums_1.WorkerRole.Unspecified]: 0,
    [enums_1.WorkerRole.Customer]: 1,
    [enums_1.WorkerRole.Worker]: 2,
    [enums_1.WorkerRole.Foreman]: 3,
    [enums_1.WorkerRole.Manager]: 4,
    [enums_1.WorkerRole.Admin]: 5,
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
//# sourceMappingURL=_base.js.map