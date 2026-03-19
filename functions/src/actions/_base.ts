import { ZodSchema } from "zod";
import { UserRole } from "../types/enums";
import { AuthContext } from "../lib/auth-context";

export { AuthContext };

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function err<T = never>(message: string): ActionResult<T> {
  return { success: false, error: message };
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.Unspecified]: 0,
  [UserRole.Customer]: 1,
  [UserRole.Worker]: 2,
  [UserRole.Foreman]: 3,
  [UserRole.Manager]: 4,
  [UserRole.Admin]: 5,
};

export function withAuth<TInput, TOutput>(
  allowedRoles: UserRole[],
  fn: (ctx: AuthContext, input: TInput) => Promise<ActionResult<TOutput>>
): (ctx: AuthContext, input: TInput) => Promise<ActionResult<TOutput>> {
  return async (ctx, input) => {
    const userLevel = ROLE_HIERARCHY[ctx.userRole] ?? 0;
    const minLevel = Math.min(...allowedRoles.map((r) => ROLE_HIERARCHY[r] ?? 0));
    if (userLevel < minLevel) {
      return err(`Insufficient permissions. Required: ${allowedRoles.join(", ")}`);
    }
    return fn(ctx, input);
  };
}

export function withValidation<TInput, TOutput>(
  schema: ZodSchema<TInput>,
  fn: (ctx: AuthContext, input: TInput) => Promise<ActionResult<TOutput>>
): (ctx: AuthContext, input: unknown) => Promise<ActionResult<TOutput>> {
  return async (ctx, rawInput) => {
    const result = schema.safeParse(rawInput);
    if (!result.success) {
      return err(`Validation error: ${result.error.issues.map((i) => i.message).join(", ")}`);
    }
    // Enforce company scoping: if caller is bound to a company, input.company_id must match
    const parsed = result.data as any;
    if (ctx.companyId && parsed?.company_id && parsed.company_id !== ctx.companyId) {
      return err("Access denied: cannot operate on a different company's data");
    }
    return fn(ctx, result.data);
  };
}

export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Verify that a Firestore document belongs to the expected company.
 * Used by get/update/delete actions to prevent cross-company access.
 */
export function assertCompanyOwnership(
  docData: FirebaseFirestore.DocumentData,
  ctx: AuthContext
): string | null {
  const docCompanyId = docData.company_id;
  if (!docCompanyId) return null; // no company_id on doc, skip check
  if (ctx.companyId && ctx.companyId !== docCompanyId) {
    return "Access denied: resource belongs to a different company";
  }
  return null; // OK
}
