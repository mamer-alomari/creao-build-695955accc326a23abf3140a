import { createFileRoute } from "@tanstack/react-router";
import { ForemanInventoryView } from "@/features/foreman/ForemanInventoryView";

export const Route = createFileRoute('/foreman/jobs/$jobId/inventory')({
  component: ForemanInventoryView,
})
