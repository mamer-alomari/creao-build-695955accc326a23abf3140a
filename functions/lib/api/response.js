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
    if (result.success) {
        return jsonSuccess(result.data);
    }
    const msg = result.error || "Unknown error";
    let status = 400;
    if (msg.includes("not found"))
        status = 404;
    else if (msg.includes("Insufficient permissions") || msg.includes("Access denied"))
        status = 403;
    else if (msg.includes("Validation error"))
        status = 422;
    return jsonError(msg, status);
}
//# sourceMappingURL=response.js.map