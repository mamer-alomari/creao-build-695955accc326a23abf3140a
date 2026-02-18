
import * as sgMail from "@sendgrid/mail";
import * as functions from "firebase-functions";
import { Twilio } from "twilio";

// Initialize SendGrid
const sendgridKey = process.env.SENDGRID_KEY || functions.config().sendgrid?.key;
if (sendgridKey) {
    sgMail.setApiKey(sendgridKey);
} else {
    functions.logger.warn("SendGrid API key not found in config.");
}

// Initialize Twilio
const twilioSid = process.env.TWILIO_SID || functions.config().twilio?.sid;
const twilioToken = process.env.TWILIO_TOKEN || functions.config().twilio?.token;
const twilioPhone = process.env.TWILIO_PHONE || functions.config().twilio?.phone;

let twilioClient: Twilio | null = null;
if (twilioSid && twilioToken) {
    twilioClient = new Twilio(twilioSid, twilioToken);
} else {
    functions.logger.warn("Twilio credentials not found in config.");
}

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
    if (!sendgridKey) {
        functions.logger.error("Cannot send email: SendGrid API key missing");
        return;
    }
    const msg = {
        to,
        from: "noreply@creao.app", // Replace with verified sender
        subject,
        text,
        html: html || text,
    };
    try {
        await sgMail.send(msg);
        functions.logger.info(`Email sent to ${to}`);
    } catch (error) {
        functions.logger.error("Error sending email", error);
        throw error;
    }
}

export async function sendSms(to: string, body: string) {
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
    } catch (error) {
        functions.logger.error("Error sending SMS", error);
        throw error;
    }
}
