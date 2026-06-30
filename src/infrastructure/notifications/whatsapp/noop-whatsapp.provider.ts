import { createLogger } from "../../logger/logger.js";

const noopWhatsAppLogger = createLogger("noop-whatsapp-provider");

type WhatsAppMessage = {
    to?: string;
    body: string;
};

class NoopWhatsAppProvider {
    async sendWhatsApp(message: WhatsAppMessage) {
        noopWhatsAppLogger.info(
            { recipientConfigured: Boolean(message.to), provider: "noop" },
            "whatsapp delivery skipped"
        );

        return {
            delivered: false,
            provider: "noop",
        };
    }
}

export { NoopWhatsAppProvider };
