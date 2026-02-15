/**
 * Role-Based Access Control Utilities
 *
 * Extends the core auth system with role extraction and permission checking.
 * Roles are extracted from JWT token payload.
 */

import { getAuthToken, getUserId, useCreaoAuth, UserRole } from "@/sdk/core/auth";
export { UserRole };

/**
 * Permission definitions by role
 */
export const RolePermissions: Record<UserRole, string[]> = {
  [UserRole.Unspecified]: [],
  [UserRole.Customer]: [
    "view_own_jobs",
    "create_quote_request",
    "view_own_invoices",
    "update_own_profile",
  ],
  [UserRole.Worker]: [
    "view_assigned_jobs",
    "update_job_status",
    "log_hours",
    "upload_job_photos",
    "view_own_schedule",
  ],
  [UserRole.Foreman]: [
    "view_assigned_jobs",
    "manage_jobs",
    "assign_resources",
    "create_quote_request",
    "update_job_status",
    "upload_job_photos",
    "view_reports"
  ],

  [UserRole.Manager]: [
    "manage_jobs",
    "manage_workers",
    "manage_equipment",
    "manage_vehicles",
    "view_reports",
    "assign_resources",
    "manage_customers",
    "view_payroll",
    "create_payroll",
  ],
  [UserRole.Admin]: [
    "full_access",
    "manage_users",
    "manage_company_settings",
    "manage_billing",
    "view_analytics",
  ],
};

/**
 * JWT payload interface
 */
interface JWTPayload {
  role?: string;
  userRole?: string;
  companyId?: string;
  company_id?: string;
  workerId?: string;
  worker_id?: string;
  email?: string;
  sub?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

/**
 * Decode and validate JWT token payload
 * @throws Error if token is invalid or expired
 */
function decodeJwtPayload(token: string): JWTPayload | null {
  try {
    // Validate token format
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.error('[JWT] Invalid token format: expected 3 parts, got', parts.length);
      return null;
    }

    const [header, payload, signature] = parts;

    // Validate parts are not empty
    if (!header || !payload || !signature) {
      console.error('[JWT] Invalid token: one or more parts are empty');
      return null;
    }

    // Decode payload
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    let decodedPayload: string;
    try {
      decodedPayload = atob(paddedBase64);
    } catch (error) {
      console.error('[JWT] Failed to decode base64 payload:', error);
      return null;
    }

    // Parse JSON
    let parsed: JWTPayload;
    try {
      parsed = JSON.parse(decodedPayload);
    } catch (error) {
      console.error('[JWT] Failed to parse JSON payload:', error);
      return null;
    }

    // Validate token expiration
    if (parsed.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (parsed.exp < now) {
        console.warn('[JWT] Token expired at', new Date(parsed.exp * 1000).toISOString());
        return null;
      }
    }

    // Log token info in development
    if (import.meta.env.MODE === 'development') {
      console.log('[JWT] Token decoded successfully', {
        role: parsed.role || parsed.userRole,
        exp: parsed.exp ? new Date(parsed.exp * 1000).toISOString() : 'no expiration',
        iat: parsed.iat ? new Date(parsed.iat * 1000).toISOString() : 'no issued time',
      });
    }

    return parsed;
  } catch (error) {
    console.error('[JWT] Unexpected error decoding token:', error);
    return null;
  }
}

/**
 * Get user role from JWT token
 */
export function getUserRole(): UserRole {
  const token = getAuthToken();

  if (!token) {
    return UserRole.Unspecified;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return UserRole.Unspecified;
  }

  // Extract role from token payload
  const role = payload.role || payload.userRole || null;

  if (!role) {
    return UserRole.Unspecified;
  }

  // Normalize role string
  const normalizedRole = role.toLowerCase();

  // Map to UserRole enum
  switch (normalizedRole) {
    case "customer":
      return UserRole.Customer;
    case "worker":
      return UserRole.Worker;
    case "manager":
    case "supervisor":
      return UserRole.Manager;
    case "admin":
      return UserRole.Admin;
    default:
      return UserRole.Unspecified;
  }
}

/**
 * Get company ID from JWT token (for managers/workers)
 */
export function getCompanyId(): string | null {
  const token = getAuthToken();

  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  return payload.companyId || payload.company_id || null;
}

/**
 * Get worker ID from JWT token (for worker role)
 */
export function getWorkerId(): string | null {
  const token = getAuthToken();

  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  return payload.workerId || payload.worker_id || null;
}

/**
 * Get user email from JWT token
 */
export function getUserEmail(): string | null {
  const token = getAuthToken();

  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  return payload.email || payload.sub || null;
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(permission: string): boolean {
  const role = getUserRole();

  // Admin has full access
  if (role === UserRole.Admin) {
    return true;
  }

  const permissions = RolePermissions[role] || [];
  return permissions.includes(permission) || permissions.includes("full_access");
}

/**
 * Check if user has any of the specified roles
 */
export function hasRole(...roles: UserRole[]): boolean {
  const userRole = getUserRole();
  return roles.includes(userRole);
}

/**
 * Check if user is authenticated with a specific role
 */
export function isAuthenticatedAs(...roles: UserRole[]): boolean {
  const token = getAuthToken();
  if (!token) {
    return false;
  }

  return hasRole(...roles);
}

/**
 * React hook for role-based authentication
 */
export function useRoleAuth() {
  const auth = useCreaoAuth();
  const userId = getUserId();
  const role = getUserRole();
  const companyId = getCompanyId();
  const workerId = getWorkerId();
  const email = getUserEmail();

  return {
    ...auth,
    userId,
    role,
    companyId,
    workerId,
    email,
    isCustomer: role === UserRole.Customer,
    isWorker: role === UserRole.Worker,
    isManager: role === UserRole.Manager,
    isAdmin: role === UserRole.Admin,
    hasPermission,
    hasRole: (...roles: UserRole[]) => hasRole(...roles),
  };
}

/**
 * Get redirect path based on user role
 */
export function getRoleRedirectPath(role: UserRole): string {
  switch (role) {
    case UserRole.Customer:
      return "/customer/dashboard";
    case UserRole.Worker:
      return "/worker/dashboard";
    case UserRole.Manager:
    case UserRole.Admin:
      return "/company/dashboard";
    default:
      return "/login";
  }
}
