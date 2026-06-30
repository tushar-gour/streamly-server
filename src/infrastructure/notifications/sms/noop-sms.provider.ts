import { createLogger } from "../../logger/logger.js";

const noopSmsLogger = createLogger("noop-sms-provider");

class NoopSmsProvider {
    async sendSms(payload: { to?: string; message?: string; userId?: string }) {
        noopSmsLogger.info(
            {
                userId: payload.userId,
                recipientConfigured: Boolean(payload.to),
                deliveryMode: "noop",
            },
            "sms delivery skipped"
        );

        return {
            delivered: false,
            provider: "noop",
        };
    }
}

export { NoopSmsProvider };
