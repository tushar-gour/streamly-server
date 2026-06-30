import { createLogger } from "../../logger/logger.js";

const noopEmailLogger = createLogger("noop-email-provider");

class NoopEmailProvider {
    async sendEmailVerification(payload: {
        userId?: string;
        email?: string;
        username?: string;
        expiresAt?: string;
        token?: string;
    }) {
        noopEmailLogger.info(
            {
                userId: payload.userId,
                recipientConfigured: Boolean(payload.email),
                deliveryMode: "noop",
            },
            "email delivery skipped"
        );

        return {
            delivered: false,
            provider: "noop",
        };
    }
}

export { NoopEmailProvider };
