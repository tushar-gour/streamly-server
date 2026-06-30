import twilio from "twilio";

import { appConfig } from "../../../config/env.js";
import { createLogger, serializeError } from "../../logger/logger.js";

const twilioLogger = createLogger("twilio-sms-provider");

const maskPhoneNumber = (phoneNumber?: string) => {
    if (!phoneNumber) return undefined;
    return phoneNumber.replace(/\d(?=\d{4})/g, "*");
};

class TwilioSmsProvider {
    #client: ReturnType<typeof twilio> | null = null;

    #getClient() {
        if (!this.#client) {
            this.#client = twilio(
                appConfig.sms.twilioAccountSid,
                appConfig.sms.twilioAuthToken
            );
        }

        return this.#client;
    }

    async sendSms(payload: { to?: string; message?: string; userId?: string }) {
        if (!payload.to || !payload.message) {
            throw new Error("SMS recipient and message are required");
        }

        const messagePayload = {
            to: payload.to,
            body: payload.message,
            ...(appConfig.sms.twilioMessagingServiceSid
                ? {
                      messagingServiceSid:
                          appConfig.sms.twilioMessagingServiceSid,
                  }
                : {
                      from: appConfig.sms.twilioPhoneNumber,
                  }),
        };

        try {
            const result =
                await this.#getClient().messages.create(messagePayload);
            twilioLogger.info(
                {
                    userId: payload.userId,
                    provider: "twilio",
                    recipient: maskPhoneNumber(payload.to),
                    sid: result.sid,
                },
                "sms sent"
            );

            return {
                delivered: true,
                provider: "twilio",
                sid: result.sid,
            };
        } catch (error) {
            twilioLogger.error(
                {
                    userId: payload.userId,
                    recipient: maskPhoneNumber(payload.to),
                    error: serializeError(error),
                },
                "twilio sms delivery failed"
            );
            throw error;
        }
    }
}

export { TwilioSmsProvider, maskPhoneNumber };
