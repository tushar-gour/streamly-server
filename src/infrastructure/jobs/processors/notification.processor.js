import { JobNames } from "../job.constants.js";

const processNotificationJob = async (job) => {
    if (job.name !== JobNames.SEND_SECURITY_NOTIFICATION) {
        throw new Error(`Unsupported notification job: ${job.name}`);
    }

    return {
        delivered: false,
        mode: "stub",
        notificationType: job.data.notificationType || "security",
    };
};

export { processNotificationJob };
