"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteExpirationReminder = exports.onWorkerCreate = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const notifications_1 = require("./notifications");
admin.initializeApp();
exports.onWorkerCreate = functions.firestore
    .document("workers/{workerId}")
    .onCreate(async (snap, context) => {
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
        promises.push((0, notifications_1.sendEmail)(worker.email, subject, text, html));
    }
    else {
        functions.logger.info(`No email provided for worker ${workerId}`);
    }
    // Send SMS Invitation
    if (worker.phone_number) {
        const message = `Hello ${worker.full_name}, you have been added to the platform. Check your email or contact your admin for details.`;
        promises.push((0, notifications_1.sendSms)(worker.phone_number, message));
    }
    else {
        functions.logger.info(`No phone number provided for worker ${workerId}`);
    }
    await Promise.all(promises);
});
/**
 * Scheduled function: runs daily to send quote expiration reminders
 * and auto-archive expired quotes.
 */
exports.quoteExpirationReminder = functions.pubsub
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
    const reminderPromises = [];
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
            reminderPromises.push((0, notifications_1.sendEmail)(quote.customer_email, subject, text, html));
        }
        if (quote.customer_phone) {
            const message = `Hi ${quote.customer_name}, your Swift Movers quote is expiring soon. Log in to book before it expires!`;
            reminderPromises.push((0, notifications_1.sendSms)(quote.customer_phone, message));
        }
    }
    await Promise.all(reminderPromises);
    // Auto-archive quotes past expires_at
    const expiredSnapshot = await db
        .collection("quotes")
        .where("status", "==", "PENDING")
        .where("expires_at", "<=", now.toISOString())
        .get();
    const archivePromises = [];
    for (const doc of expiredSnapshot.docs) {
        functions.logger.info(`Auto-archiving expired quote ${doc.id}`);
        archivePromises.push(doc.ref.update({ status: "ARCHIVED", update_time: now.toISOString() }));
    }
    await Promise.all(archivePromises);
    functions.logger.info(`Quote reminders: ${expiringSnapshot.size} reminded, ${expiredSnapshot.size} archived`);
});
//# sourceMappingURL=index.js.map