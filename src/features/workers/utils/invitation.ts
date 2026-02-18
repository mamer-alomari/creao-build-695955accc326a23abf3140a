import type { WorkerModel } from "@/sdk/database/orm/orm_worker";
import { toast } from "sonner";

/**
 * Sends an invitation to a worker via email or SMS.
 * Currently simulates the process with a toast notification and console log.
 * 
 * @param worker The worker model containing contact information
 * @returns Promise that resolves when the invitation process is initiated
 */
export async function sendWorkerInvitation(worker: WorkerModel): Promise<void> {
    // In a real implementation, this would call a backend endpoint or cloud function
    // to send an email via SendGrid, AWS SES, or an SMS via Twilio.

    // The actual invitation is now handled by a Firebase Cloud Function trigger (onWorkerCreate).
    // This utility serves to provide immediate feedback to the user.

    toast.success(`Worker created: ${worker.full_name}`, {
        description: `An invitation will be sent to ${worker.email || worker.phone_number || "their contact info"} shortly.`,
    });
}
