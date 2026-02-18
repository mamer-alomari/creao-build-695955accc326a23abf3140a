import { createFileRoute } from '@tanstack/react-router'
import { ForemanJobExecution } from '@/features/foreman/ForemanJobExecution'

export const Route = createFileRoute('/foreman/jobs/$jobId/execute')({
    component: ForemanJobExecution,
})
