import sendgridMail from "@sendgrid/mail";

import { appConfig } from "../../../config/env.js";
import { createLogger, serializeError } from "../../logger/logger.js";
import {
    createEmailVerificationTemplate,
    createOtpEmailTemplate,
} from "./email-template.service.js";

const sendgridLogger = createLogger("sendgrid-email-provider");

class SendGridEmailProvider {
    #configured = false;

    #configure() {
        if (this.#configured) return;
        sendgridMail.setApiKey(appConfig.email.sendgridApiKey);
        this.#configured = true;
    }

    async sendEmailVerification(payload: {
        userId?: string;
        email?: string;
        username?: string;
        expiresAt?: string;
        token?: string;
    }) {
        if (!payload.email || !payload.token) {
            throw new Error(
                "Email recipient and verification token are required"
            );
        }

        this.#configure();
        const template = createEmailVerificationTemplate({
            username: payload.username,
            token: payload.token,
            expiresAt: payload.expiresAt,
        });

        try {
            await sendgridMail.send({
                to: payload.email,
                from: {
                    email: appConfig.email.sendgridFromEmail,
                    name: appConfig.email.sendgridFromName,
                },
                subject: template.subject,
                text: template.text,
                html: template.html,
            });

            sendgridLogger.info(
                { userId: payload.userId, provider: "sendgrid" },
                "email verification sent"
            );

            return {
                delivered: true,
                provider: "sendgrid",
            };
        } catch (error) {
            sendgridLogger.error(
                {
                    userId: payload.userId,
                    error: serializeError(error),
                },
                "sendgrid email delivery failed"
            );
            throw error;
        }
    }

    async sendOtp(payload: {
        userId?: string;
        email?: string;
        username?: string;
        code?: string;
        expiresInMinutes?: number;
        purpose?: string;
    }) {
        if (!payload.email || !payload.code) {
            throw new Error("Email recipient and OTP code are required");
        }

        this.#configure();
        const template = createOtpEmailTemplate({
            username: payload.username,
            code: payload.code,
            expiresInMinutes: payload.expiresInMinutes || 5,
            purpose: payload.purpose,
        });

        await sendgridMail.send({
            to: payload.email,
            from: {
                email: appConfig.email.sendgridFromEmail,
                name: appConfig.email.sendgridFromName,
            },
            subject: template.subject,
            text: template.text,
            html: template.html,
        });

        sendgridLogger.info(
            { userId: payload.userId, provider: "sendgrid" },
            "otp email sent"
        );

        return {
            delivered: true,
            provider: "sendgrid",
        };
    }
}

export { SendGridEmailProvider };
