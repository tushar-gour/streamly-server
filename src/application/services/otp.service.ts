import crypto from "node:crypto";

import { appConfig } from "../../config/env.js";
import { prisma } from "../../infrastructure/database/prisma/client.js";
import { createEmailProvider } from "../../infrastructure/notifications/email/email-provider.factory.js";
import { createSmsProvider } from "../../infrastructure/notifications/sms/sms-provider.factory.js";
import { createWhatsAppProvider } from "../../infrastructure/notifications/whatsapp/whatsapp-provider.factory.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { createId } from "../../shared/helpers/id-generator.js";

const hashValue = (value: string): string =>
    crypto.createHash("sha256").update(value).digest("hex");

const generateOtp = (): string => {
    const max = 10 ** appConfig.otp.length;
    return crypto
        .randomInt(0, max)
        .toString()
        .padStart(appConfig.otp.length, "0");
};

type OtpChannel = "email" | "sms" | "whatsapp";

type CreateChallengeInput = {
    userId?: string;
    identifier: string;
    channel: OtpChannel;
    purpose: string;
    username?: string;
};

class OtpService {
    readonly #emailProvider = createEmailProvider();
    readonly #smsProvider = createSmsProvider();
    readonly #whatsappProvider = createWhatsAppProvider();

    async createChallenge({
        userId,
        identifier,
        channel,
        purpose,
        username,
    }: CreateChallengeInput) {
        if (!appConfig.otp.enabled) {
            throw new ApiError(503, "OTP authentication is disabled");
        }

        const code = generateOtp();
        const challenge = await prisma.authChallenge.create({
            data: {
                id: createId(),
                userId,
                identifierHash: hashValue(identifier.toLowerCase()),
                channel,
                purpose,
                codeHash: hashValue(code),
                expiresAt: new Date(
                    Date.now() + appConfig.otp.expirySeconds * 1000
                ),
                maxAttempts: appConfig.otp.maxAttempts,
            },
        });

        await this.#deliver({
            channel,
            identifier,
            code,
            username,
            userId,
            purpose,
        });

        return {
            challengeId: challenge.id,
            channel,
            purpose,
            expiresAt: challenge.expiresAt,
        };
    }

    async verifyChallenge({
        challengeId,
        code,
        purpose,
    }: {
        challengeId: string;
        code: string;
        purpose: string;
    }) {
        const challenge = await prisma.authChallenge.findUnique({
            where: { id: challengeId },
        });

        if (!challenge || challenge.purpose !== purpose) {
            throw new ApiError(400, "Invalid OTP challenge");
        }

        if (challenge.consumedAt) {
            throw new ApiError(400, "OTP challenge already used");
        }

        if (challenge.expiresAt <= new Date()) {
            throw new ApiError(400, "OTP challenge expired");
        }

        if (challenge.failedAttempts >= challenge.maxAttempts) {
            throw new ApiError(429, "OTP attempt limit exceeded");
        }

        if (hashValue(code) !== challenge.codeHash) {
            await prisma.authChallenge.update({
                where: { id: challenge.id },
                data: { failedAttempts: { increment: 1 } },
            });
            throw new ApiError(400, "Invalid OTP code");
        }

        await prisma.authChallenge.update({
            where: { id: challenge.id },
            data: { consumedAt: new Date() },
        });

        return challenge;
    }

    async #deliver({
        channel,
        identifier,
        code,
        username,
        userId,
        purpose,
    }: {
        channel: OtpChannel;
        identifier: string;
        code: string;
        username?: string;
        userId?: string;
        purpose: string;
    }) {
        if (channel === "email") {
            return this.#emailProvider.sendOtp({
                userId,
                email: identifier,
                username,
                code,
                purpose,
                expiresInMinutes: Math.ceil(appConfig.otp.expirySeconds / 60),
            });
        }

        const message = `Your Streamly verification code is ${code}. It expires in ${Math.ceil(
            appConfig.otp.expirySeconds / 60
        )} minutes.`;

        if (channel === "whatsapp") {
            return this.#whatsappProvider.sendWhatsApp({
                to: identifier,
                body: message,
            });
        }

        return this.#smsProvider.sendSms({
            to: identifier,
            message,
            userId,
        });
    }
}

export { OtpService, hashValue };
