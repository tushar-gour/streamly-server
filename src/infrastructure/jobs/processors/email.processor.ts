// @ts-nocheck
import { JobNames } from "../job.constants.js";
import { EmailDeliveryProvider } from "../providers/email-delivery.provider.js";

const emailDeliveryProvider = new EmailDeliveryProvider();

const processEmailJob = async (job) => {
    if (job.name !== JobNames.SEND_EMAIL_VERIFICATION) {
        throw new Error(`Unsupported email job: ${job.name}`);
    }

    const { userId, email, username, expiresAt, token } = job.data;

    await emailDeliveryProvider.sendEmailVerification({
        userId,
        email,
        username,
        expiresAt,
        token,
    });

    return {
        delivered: false,
        mode: "stub",
    };
};

export { processEmailJob };
