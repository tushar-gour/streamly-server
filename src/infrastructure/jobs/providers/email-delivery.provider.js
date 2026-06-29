import { createLogger } from "../../logger/logger.js";

const emailDeliveryLogger = createLogger("email-delivery-provider");

class EmailDeliveryProvider {
    async sendEmailVerification({ userId, email, username, expiresAt }) {
        emailDeliveryLogger.info(
            {
                userId,
                email,
                username,
                expiresAt,
                deliveryMode: "stub",
            },
            "email verification delivery skipped"
        );

        return {
            delivered: false,
            mode: "stub",
        };
    }
}

export { EmailDeliveryProvider };
