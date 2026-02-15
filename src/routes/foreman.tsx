import { createFileRoute, redirect } from '@tanstack/react-router'
import { useCreaoAuth, UserRole, getAuthState } from '@/sdk/core/auth'

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
  const { user, role } = useCreaoAuth()

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Foreman Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome, {user?.email} (Role: {role})
      </p>
      <div className="mt-8">
        <p>Foreman features coming soon...</p>
      </div>
    </div>
  )
}
