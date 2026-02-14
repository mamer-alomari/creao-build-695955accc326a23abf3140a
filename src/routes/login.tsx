import { createFileRoute } from '@tanstack/react-router'
import { LoginView } from '@/features/auth/LoginView'
import { z } from 'zod'

const loginSearchSchema = z.object({
    tab: z.enum(['login', 'signup']).optional(),
    redirect: z.string().optional(),
    role: z.string().optional(),
    quoteId: z.string().optional(),
})

export const Route = createFileRoute('/login')({
    validateSearch: (search) => loginSearchSchema.parse(search),
    component: LoginView,
})
