
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { sendEmail, sendSms } from "./notifications";
import { handleRequest } from "./api/router";

if (!admin.apps.length) {
  admin.initializeApp();
}

// --- REST API (Cloud Function) ---
export const api = functions.https.onRequest(handleRequest);

export const onWorkerCreate = functions.firestore
    .document("workers/{workerId}")
    .onCreate(async (snap: functions.firestore.QueryDocumentSnapshot, context: functions.EventContext) => {
        const worker = snap.data();
        const workerId = context.params.workerId;

        functions.logger.info(`New worker created: ${workerId}`);

        if (!worker) {
            functions.logger.warn("No data in worker document");
            return;
        }

        const promises = [];

        // Send Email Invitation
        if (worker.email) {
            const subject = "Welcome to the Team!";
            const text = `Hello ${worker.full_name},\n\nYou have been added as a worker on the platform. Please contact your administrator for onboarding details.\n\nBest,\nThe Team`;
            const html = `
                <p>Hello ${worker.full_name},</p>
                <p>You have been added as a worker on the platform.</p>
                <p>Please contact your administrator for onboarding details.</p>
                <br/>
                <p>Best,<br/>The Team</p>
            `;
            promises.push(sendEmail(worker.email, subject, text, html));
        } else {
            functions.logger.info(`No email provided for worker ${workerId}`);
        }

        // Send SMS Invitation
        if (worker.phone_number) {
            const message = `Hello ${worker.full_name}, you have been added to the platform. Check your email or contact your admin for details.`;
            promises.push(sendSms(worker.phone_number, message));
        } else {
            functions.logger.info(`No phone number provided for worker ${workerId}`);
        }

        await Promise.all(promises);
    });

/**
 * Scheduled function: runs daily to send quote expiration reminders
 * and auto-archive expired quotes.
 */
export const quoteExpirationReminder = functions.pubsub
    .schedule("every 24 hours")
    .onRun(async () => {
        const db = admin.firestore();
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Query PENDING quotes expiring within the next 24 hours
        const expiringSnapshot = await db
            .collection("quotes")
            .where("status", "==", "PENDING")
            .where("expires_at", "<=", tomorrow.toISOString())
            .where("expires_at", ">", now.toISOString())
            .get();

        const reminderPromises: Promise<void>[] = [];

        for (const doc of expiringSnapshot.docs) {
            const quote = doc.data();
            functions.logger.info(`Sending expiration reminder for quote ${doc.id}`);

            if (quote.customer_email) {
                const subject = "Your moving quote is about to expire";
                const text = `Hi ${quote.customer_name},\n\nYour moving quote (${doc.id.slice(0, 8).toUpperCase()}) is expiring soon. Log in to book your move before it expires.\n\nBest,\nSwift Movers`;
                const html = `
                    <p>Hi ${quote.customer_name},</p>
                    <p>Your moving quote (<strong>${doc.id.slice(0, 8).toUpperCase()}</strong>) is expiring soon.</p>
                    <p>Log in to book your move before it expires.</p>
                    <br/>
                    <p>Best,<br/>Swift Movers</p>
                `;
                reminderPromises.push(sendEmail(quote.customer_email, subject, text, html));
            }

            if (quote.customer_phone) {
                const message = `Hi ${quote.customer_name}, your Swift Movers quote is expiring soon. Log in to book before it expires!`;
                reminderPromises.push(sendSms(quote.customer_phone, message));
            }
        }

        await Promise.all(reminderPromises);

        // Auto-archive quotes past expires_at
        const expiredSnapshot = await db
            .collection("quotes")
            .where("status", "==", "PENDING")
            .where("expires_at", "<=", now.toISOString())
            .get();

        const archivePromises: Promise<FirebaseFirestore.WriteResult>[] = [];

        for (const doc of expiredSnapshot.docs) {
            functions.logger.info(`Auto-archiving expired quote ${doc.id}`);
            archivePromises.push(
                doc.ref.update({ status: "ARCHIVED", update_time: now.toISOString() })
            );
        }

        await Promise.all(archivePromises);

        functions.logger.info(
            `Quote reminders: ${expiringSnapshot.size} reminded, ${expiredSnapshot.size} archived`
        );
    });
