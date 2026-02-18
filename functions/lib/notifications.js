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
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSms = exports.sendEmail = void 0;
const sgMail = __importStar(require("@sendgrid/mail"));
const functions = __importStar(require("firebase-functions"));
const twilio_1 = require("twilio");
// Initialize SendGrid
const sendgridKey = process.env.SENDGRID_KEY || ((_a = functions.config().sendgrid) === null || _a === void 0 ? void 0 : _a.key);
if (sendgridKey) {
    sgMail.setApiKey(sendgridKey);
}
else {
    functions.logger.warn("SendGrid API key not found in config.");
}
// Initialize Twilio
const twilioSid = process.env.TWILIO_SID || ((_b = functions.config().twilio) === null || _b === void 0 ? void 0 : _b.sid);
const twilioToken = process.env.TWILIO_TOKEN || ((_c = functions.config().twilio) === null || _c === void 0 ? void 0 : _c.token);
const twilioPhone = process.env.TWILIO_PHONE || ((_d = functions.config().twilio) === null || _d === void 0 ? void 0 : _d.phone);
let twilioClient = null;
if (twilioSid && twilioToken) {
    twilioClient = new twilio_1.Twilio(twilioSid, twilioToken);
}
else {
    functions.logger.warn("Twilio credentials not found in config.");
}
async function sendEmail(to, subject, text, html) {
    if (!sendgridKey) {
        functions.logger.error("Cannot send email: SendGrid API key missing");
        return;
    }
    const msg = {
        to,
        from: "noreply@creao.app",
        subject,
        text,
        html: html || text,
    };
    try {
        await sgMail.send(msg);
        functions.logger.info(`Email sent to ${to}`);
    }
    catch (error) {
        functions.logger.error("Error sending email", error);
        throw error;
    }
}
exports.sendEmail = sendEmail;
async function sendSms(to, body) {
    if (!twilioClient || !twilioPhone) {
        functions.logger.error("Cannot send SMS: Twilio credentials or phone missing");
        return;
    }
    try {
        await twilioClient.messages.create({
            body,
            from: twilioPhone,
            to,
        });
        functions.logger.info(`SMS sent to ${to}`);
    }
    catch (error) {
        functions.logger.error("Error sending SMS", error);
        throw error;
    }
}
exports.sendSms = sendSms;
//# sourceMappingURL=notifications.js.map