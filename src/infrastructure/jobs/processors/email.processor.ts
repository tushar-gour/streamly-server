// @ts-nocheck
import { JobNames } from "../job.constants.js";
import { createEmailProvider } from "../../notifications/email/email-provider.factory.js";

const emailDeliveryProvider = createEmailProvider();

const processEmailJob = async (job) => {
    if (job.name !== JobNames.SEND_EMAIL_VERIFICATION) {
        throw new Error(`Unsupported email job: ${job.name}`);
    }

    const { userId, email, username, expiresAt, token } = job.data;

    const result = await emailDeliveryProvider.sendEmailVerification({
        userId,
        email,
        username,
        expiresAt,
        token,
    });

    return {
        delivered: result.delivered,
        provider: result.provider,
    };
};

export { processEmailJob };
