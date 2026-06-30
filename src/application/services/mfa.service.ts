import crypto from "node:crypto";
import { generateSecret, generateURI, verifySync } from "otplib";

import { appConfig } from "../../config/env.js";
import { prisma } from "../../infrastructure/database/prisma/client.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { createId } from "../../shared/helpers/id-generator.js";
import { hashValue } from "./otp.service.js";

const getEncryptionKey = (): Buffer => {
    const rawKey = appConfig.mfa.secretEncryptionKey;
    if (!rawKey)
        throw new ApiError(500, "MFA encryption key is not configured");

    const decoded = Buffer.from(rawKey, "base64");
    return decoded.length === 32
        ? decoded
        : crypto.createHash("sha256").update(rawKey).digest();
};

const encryptSecret = (secret: string): string => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const encrypted = Buffer.concat([
        cipher.update(secret, "utf8"),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString(
        "base64"
    )}`;
};

const decryptSecret = (encryptedSecret: string): string => {
    const [iv, tag, encrypted] = encryptedSecret.split(".");
    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        getEncryptionKey(),
        Buffer.from(iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([
        decipher.update(Buffer.from(encrypted, "base64")),
        decipher.final(),
    ]).toString("utf8");
};

const hashContext = (value?: string): string | null =>
    value ? hashValue(value) : null;

type DeviceContext = {
    deviceId: string;
    ipAddress?: string;
    userAgent?: string;
};

class MfaService {
    async setupTotp(userId: string, email: string) {
        const secret = generateSecret();
        const otpauthUrl = generateURI({
            issuer: appConfig.mfa.issuer,
            label: email,
            secret,
        });

        await prisma.userMfa.upsert({
            where: { userId_type: { userId, type: "totp" } },
            create: {
                id: createId(),
                userId,
                type: "totp",
                secretEncrypted: encryptSecret(secret),
            },
            update: {
                secretEncrypted: encryptSecret(secret),
                enabledAt: null,
            },
        });

        return { otpauthUrl };
    }

    async verifyTotpSetup(userId: string, code: string) {
        const method = await prisma.userMfa.findUnique({
            where: { userId_type: { userId, type: "totp" } },
        });
        if (!method) throw new ApiError(404, "MFA setup not found");

        const secret = decryptSecret(method.secretEncrypted);
        if (!verifySync({ secret, token: code }).valid) {
            throw new ApiError(400, "Invalid authenticator code");
        }

        const now = new Date();
        await prisma.$transaction([
            prisma.userMfa.update({
                where: { id: method.id },
                data: { enabledAt: now, lastVerifiedAt: now },
            }),
            prisma.user.update({
                where: { id: userId },
                data: { mfaEnabledAt: now, onboardingStatus: "active" },
            }),
        ]);

        return { mfaEnabled: true };
    }

    async createChallenge(
        userId: string,
        loginMethod: string,
        context: DeviceContext
    ) {
        return prisma.mfaChallenge.create({
            data: {
                id: createId(),
                userId,
                loginMethod,
                expiresAt: new Date(
                    Date.now() + appConfig.mfa.challengeExpirySeconds * 1000
                ),
                deviceFingerprintHash: hashValue(context.deviceId),
                ipHash: hashContext(context.ipAddress),
                userAgentHash: hashContext(context.userAgent),
            },
        });
    }

    async verifyChallenge(
        challengeId: string,
        code: string,
        context: DeviceContext
    ) {
        const challenge = await prisma.mfaChallenge.findUnique({
            where: { id: challengeId },
        });
        if (!challenge || challenge.consumedAt) {
            throw new ApiError(400, "Invalid MFA challenge");
        }
        if (challenge.expiresAt <= new Date()) {
            throw new ApiError(400, "MFA challenge expired");
        }
        if (challenge.failedAttempts >= appConfig.mfa.maxVerifyAttempts) {
            throw new ApiError(429, "MFA attempt limit exceeded");
        }

        const method = await prisma.userMfa.findUnique({
            where: { userId_type: { userId: challenge.userId, type: "totp" } },
        });
        if (!method?.enabledAt) throw new ApiError(403, "MFA is not enabled");

        const secret = decryptSecret(method.secretEncrypted);
        if (!verifySync({ secret, token: code }).valid) {
            await prisma.mfaChallenge.update({
                where: { id: challenge.id },
                data: { failedAttempts: { increment: 1 } },
            });
            throw new ApiError(400, "Invalid authenticator code");
        }

        await prisma.mfaChallenge.update({
            where: { id: challenge.id },
            data: { consumedAt: new Date() },
        });

        return this.createTrustToken(challenge.userId, context);
    }

    async createTrustToken(userId: string, context: DeviceContext) {
        const token = crypto.randomBytes(32).toString("base64url");
        await prisma.mfaTrustToken.create({
            data: {
                id: createId(),
                userId,
                tokenHash: hashValue(token),
                deviceIdHash: hashValue(context.deviceId),
                ipHash: hashContext(context.ipAddress),
                userAgentHash: hashContext(context.userAgent),
                expiresAt: new Date(
                    Date.now() + appConfig.mfa.trustTokenExpirySeconds * 1000
                ),
            },
        });

        return token;
    }

    async validateTrustToken(
        userId: string,
        token: string,
        context: DeviceContext
    ) {
        const trustToken = await prisma.mfaTrustToken.findUnique({
            where: { tokenHash: hashValue(token) },
        });

        if (
            !trustToken ||
            trustToken.userId !== userId ||
            trustToken.revokedAt ||
            trustToken.expiresAt <= new Date() ||
            trustToken.deviceIdHash !== hashValue(context.deviceId) ||
            trustToken.ipHash !== hashContext(context.ipAddress) ||
            trustToken.userAgentHash !== hashContext(context.userAgent)
        ) {
            return false;
        }

        await prisma.mfaTrustToken.update({
            where: { id: trustToken.id },
            data: { lastUsedAt: new Date() },
        });

        return true;
    }
}

export { MfaService };
