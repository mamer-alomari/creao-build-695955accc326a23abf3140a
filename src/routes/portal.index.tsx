import { createFileRoute } from '@tanstack/react-router'
import { PortalDashboard } from '@/features/portal/components/PortalDashboard'

export const Route = createFileRoute('/portal/')({
  component: PortalDashboard,
})
