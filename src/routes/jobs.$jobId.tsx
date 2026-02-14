
import { createFileRoute } from "@tanstack/react-router";
import { JobPublicView } from "@/features/jobs/components/public/JobPublicView";

export const Route = createFileRoute("/jobs/$jobId")({
    component: JobPublicView,
});
