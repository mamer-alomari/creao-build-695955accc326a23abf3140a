
/**
 * Notifications Utility
 * Handles sending Email and SMS notifications via backend services (e.g., Firebase Cloud Functions).
 * 
 * For now, this is a client-side simulation. In a real production app, 
 * these would call a Cloud Function to keep API keys secure.
 */

export interface NotificationPayload {
    type: 'email' | 'sms' | 'both';
    recipient: {
        email?: string;
        phone?: string;
        name?: string;
    };
    subject?: string; // For email
    message: string;
}

export const notifications = {
    /**
     * Sends a notification to a customer.
     * @param payload Notification details
     * @returns Promise resolving to true if successful
     */
    async send(payload: NotificationPayload): Promise<boolean> {
        console.log(`[Mock Notification Service] Sending ${payload.type}...`);
        console.log(`To: ${payload.recipient.name} (${payload.recipient.email || ''} / ${payload.recipient.phone || ''})`);
        console.log(`Subject: ${payload.recipient.name}`);
        console.log(`Message: ${payload.message}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simulate success
        console.log("[Mock Notification Service] Sent successfully.");
        return true;
    },

    /**
     * Quick helper for notifying customer of arrival
     */
    async notifyArrival(customerName: string, customerPhone?: string, customerEmail?: string) {
        return this.send({
            type: 'both',
            recipient: {
                name: customerName,
                phone: customerPhone,
                email: customerEmail
            },
            subject: "Your Moving Team has Arrived!",
            message: `Hi ${customerName}, your Abadai moving team has arrived at the pickup location. We will be with you shortly!`
        });
    }
};
