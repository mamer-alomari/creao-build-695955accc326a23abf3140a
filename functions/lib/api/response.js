"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonSuccess = jsonSuccess;
exports.jsonError = jsonError;
exports.actionToResponse = actionToResponse;
function jsonSuccess(data, status = 200) {
    return { status, body: { success: true, data } };
}
function jsonError(message, status = 400) {
    return { status, body: { success: false, error: message } };
}
function actionToResponse(result) {
    var _a, _b;
    if (result.success) {
        return jsonSuccess(result.data);
    }
    const status = ((_a = result.error) === null || _a === void 0 ? void 0 : _a.includes("not found")) ? 404
        : ((_b = result.error) === null || _b === void 0 ? void 0 : _b.includes("Insufficient permissions")) ? 403
            : 400;
    return jsonError(result.error || "Unknown error", status);
}
//# sourceMappingURL=response.js.map