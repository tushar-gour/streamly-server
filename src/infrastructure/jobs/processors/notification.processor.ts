// @ts-nocheck
import { JobNames } from "../job.constants.js";
import { createSmsProvider } from "../../notifications/sms/sms-provider.factory.js";
import { createWhatsAppProvider } from "../../notifications/whatsapp/whatsapp-provider.factory.js";

const smsProvider = createSmsProvider();
const whatsappProvider = createWhatsAppProvider();

const processNotificationJob = async (job) => {
    if (job.name !== JobNames.SEND_SECURITY_NOTIFICATION) {
        throw new Error(`Unsupported notification job: ${job.name}`);
    }

    if (job.data.whatsappNumber && job.data.message) {
        const result = await whatsappProvider.sendWhatsApp({
            to: job.data.whatsappNumber,
            body: job.data.message,
        });

        return {
            delivered: result.delivered,
            provider: result.provider,
            notificationType: job.data.notificationType || "security",
        };
    }

    if (job.data.phoneNumber && job.data.message) {
        const result = await smsProvider.sendSms({
            to: job.data.phoneNumber,
            message: job.data.message,
            userId: job.data.userId,
        });

        return {
            delivered: result.delivered,
            provider: result.provider,
            notificationType: job.data.notificationType || "security",
        };
    }

    return {
        delivered: false,
        mode: "noop",
        notificationType: job.data.notificationType || "security",
    };
};

export { processNotificationJob };
