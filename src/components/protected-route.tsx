/**
 * Protected Route Components
 *
 * Provides route-level access control based on user roles.
 */

import * as React from "react";
import { Navigate } from "@tanstack/react-router";
import { useRoleAuth, UserRole, hasRole } from "@/lib/auth-roles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallbackPath?: string;
}

/**
 * Protected Route Wrapper
 * Restricts access based on user roles
 */
export function ProtectedRoute({
  allowedRoles,
  children,
  fallbackPath = "/login",
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role } = useRoleAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <CardTitle>Authenticating...</CardTitle>
            <CardDescription>Please wait while we verify your credentials</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} />;
  }

  // Check if user has required role
  if (!hasRole(...allowedRoles)) {
    return <UnauthorizedAccess userRole={role} requiredRoles={allowedRoles} />;
  }

  // Render protected content
  return <>{children}</>;
}

/**
 * Unauthorized Access Component
 */
function UnauthorizedAccess({
  userRole,
  requiredRoles,
}: {
  userRole: UserRole;
  requiredRoles: UserRole[];
}) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-destructive/10 p-4">
              <Shield className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription className="text-base mt-2">
            You don't have permission to access this page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Your Role:</span>
              <span className="capitalize">{userRole}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Required Roles:</span>
              <span className="capitalize">{requiredRoles.join(", ")}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => window.history.back()} variant="outline">
              Go Back
            </Button>
            <Button onClick={() => (window.location.href = "/")} variant="default">
              Go to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Role-based content wrapper (for inline content protection)
 */
export function RoleContent({
  allowedRoles,
  children,
  fallback,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated } = useRoleAuth();

  if (!isAuthenticated || !hasRole(...allowedRoles)) {
    return fallback || null;
  }

  return <>{children}</>;
}

/**
 * Permission-based content wrapper
 */
export function PermissionContent({
  permission,
  children,
  fallback,
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission: checkPermission } = useRoleAuth();

  if (!checkPermission(permission)) {
    return fallback || null;
  }

  return <>{children}</>;
}
