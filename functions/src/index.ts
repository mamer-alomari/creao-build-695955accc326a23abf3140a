
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { sendEmail, sendSms } from "./notifications";

admin.initializeApp();

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
