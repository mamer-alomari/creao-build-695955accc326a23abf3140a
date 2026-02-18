import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/foreman/jobs/$jobId')({
  component: ForemanJobLayout,
})

function ForemanJobLayout() {
  return (
    <>
      <Outlet />
    </>
  )
}
