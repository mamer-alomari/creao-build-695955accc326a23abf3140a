import { ActionResult } from "../actions/_base";

export function jsonSuccess<T>(data: T, status = 200) {
  return { status, body: { success: true, data } };
}

export function jsonError(message: string, status = 400) {
  return { status, body: { success: false, error: message } };
}

export function actionToResponse<T>(result: ActionResult<T>) {
  if (result.success) {
    return jsonSuccess(result.data);
  }
  const msg = result.error || "Unknown error";
  let status = 400;
  if (msg.includes("not found")) status = 404;
  else if (msg.includes("Insufficient permissions") || msg.includes("Access denied")) status = 403;
  else if (msg.includes("Validation error")) status = 422;
  return jsonError(msg, status);
}
