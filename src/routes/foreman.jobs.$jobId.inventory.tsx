import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ForemanInventoryView } from "@/features/foreman/ForemanInventoryView";

const inventorySearchSchema = z.object({
  stopId: z.string().optional(),
  mode: z.enum(["load", "unload"]).optional(),
});

export const Route = createFileRoute('/foreman/jobs/$jobId/inventory')({
  validateSearch: inventorySearchSchema,
  component: ForemanInventoryView,
})
