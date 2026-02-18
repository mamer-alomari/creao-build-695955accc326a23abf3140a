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
exports.onWorkerCreate = void 0;
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
//# sourceMappingURL=index.js.map