
import { createFileRoute } from '@tanstack/react-router'
import { WorkerDashboard } from '@/features/worker/components/WorkerDashboard'

export const Route = createFileRoute('/worker/')({
    component: WorkerDashboard,
})
