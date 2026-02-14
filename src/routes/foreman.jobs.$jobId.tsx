import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/foreman/jobs/$jobId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/foreman/jobs/$jobId"!</div>
}
