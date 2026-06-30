import twilio from "twilio";

import { appConfig } from "../../../config/env.js";
import { createLogger, serializeError } from "../../logger/logger.js";
import { maskPhoneNumber } from "../sms/twilio-sms.provider.js";

const whatsappLogger = createLogger("twilio-whatsapp-provider");

type WhatsAppMessage = {
    to: string;
    body: string;
};

const normalizeWhatsAppNumber = (phoneNumber: string): string =>
    phoneNumber.startsWith("whatsapp:")
        ? phoneNumber
        : `whatsapp:${phoneNumber}`;

class TwilioWhatsAppProvider {
    readonly #client: ReturnType<typeof twilio>;

    constructor(
        client = twilio(
            appConfig.sms.twilioAccountSid,
            appConfig.sms.twilioAuthToken
        )
    ) {
        this.#client = client;
    }

    async sendWhatsApp({ to, body }: WhatsAppMessage) {
        try {
            const message = await this.#client.messages.create({
                from: appConfig.sms.twilioWhatsAppFrom,
                to: normalizeWhatsAppNumber(to),
                body,
            });

            whatsappLogger.info(
                {
                    provider: "twilio",
                    recipient: maskPhoneNumber(to),
                    sid: message.sid,
                },
                "whatsapp message sent"
            );

            return {
                delivered: true,
                provider: "twilio",
                messageId: message.sid,
            };
        } catch (error) {
            whatsappLogger.error(
                {
                    error: serializeError(error, true),
                    recipient: maskPhoneNumber(to),
                },
                "whatsapp delivery failed"
            );
            throw error;
        }
    }
}

export { TwilioWhatsAppProvider, normalizeWhatsAppNumber };
