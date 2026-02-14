import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/worker/jobs/$jobId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/worker/jobs/$jobId"!</div>
}
