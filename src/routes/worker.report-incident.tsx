import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/worker/report-incident')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/worker/report-incident"!</div>
}
