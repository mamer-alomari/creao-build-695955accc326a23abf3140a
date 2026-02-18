import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { UserRole, getAuthState } from '@/sdk/core/auth'

export const Route = createFileRoute('/foreman')({
  beforeLoad: () => {
    // Get auth state synchronously from store
    const { status, role } = getAuthState()

    // Check if user is authenticated
    if (status !== 'authenticated') {
      throw redirect({
        to: '/login',
        search: {
          redirect: '/foreman',
        },
      })
    }

    // Check if user has required role (Foreman, Manager, or Admin)
    const allowedRoles = [UserRole.Foreman, UserRole.Manager, UserRole.Admin]
    if (!allowedRoles.includes(role)) {
      throw redirect({
        to: '/',
      })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
