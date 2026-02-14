import { createFileRoute } from '@tanstack/react-router'
import { OnboardingView } from '@/features/onboarding/OnboardingView'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingView,
})
