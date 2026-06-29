import crypto from "node:crypto";
import jwt from "jsonwebtoken";

import { appConfig } from "../../config/env.js";
import { createId } from "../../shared/helpers/id-generator.js";
import { UnauthorizedError } from "../../shared/errors/api-error.js";

const secondsByUnit = Object.freeze({
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
});

class TokenService {
    createSessionId() {
        return createId();
    }

    generateAccessToken(user, sessionId) {
        return jwt.sign(
            {
                _id: user._id,
                username: user.username,
                email: user.email,
                sessionId,
                type: "access",
            },
            appConfig.jwt.accessTokenSecret,
            { expiresIn: appConfig.jwt.accessTokenExpiry }
        );
    }

    generateRefreshToken(user, sessionId) {
        return jwt.sign(
            {
                _id: user._id,
                sessionId,
                tokenId: createId(),
                type: "refresh",
            },
            appConfig.jwt.refreshTokenSecret,
            { expiresIn: appConfig.jwt.refreshTokenExpiry }
        );
    }

    verifyAccessToken(token) {
        const payload = this.#verifyToken(
            token,
            appConfig.jwt.accessTokenSecret,
            "access"
        );
        return payload;
    }

    verifyRefreshToken(token) {
        const payload = this.#verifyToken(
            token,
            appConfig.jwt.refreshTokenSecret,
            "refresh"
        );
        return payload;
    }

    hashToken(token) {
        return crypto.createHash("sha256").update(token).digest("hex");
    }

    compareTokenHash(token, tokenHash) {
        const incomingHash = this.hashToken(token);
        const incoming = Buffer.from(incomingHash, "hex");
        const stored = Buffer.from(tokenHash, "hex");

        if (incoming.length !== stored.length) {
            return false;
        }

        return crypto.timingSafeEqual(incoming, stored);
    }

    getRefreshTokenExpiresAt() {
        return new Date(
            Date.now() +
                this.#expiryToMilliseconds(appConfig.jwt.refreshTokenExpiry)
        );
    }

    getEmailVerificationTokenExpiresAt() {
        return new Date(
            Date.now() +
                this.#expiryToMilliseconds(
                    appConfig.auth.emailVerificationTokenExpiry
                )
        );
    }

    getRefreshCookieMaxAge() {
        return this.#expiryToMilliseconds(appConfig.jwt.refreshTokenExpiry);
    }

    generateOpaqueToken() {
        return crypto.randomBytes(32).toString("hex");
    }

    #verifyToken(token, secret, expectedType) {
        if (!token) {
            throw new UnauthorizedError("Token is required");
        }

        try {
            const payload = jwt.verify(token, secret);

            if (payload.type !== expectedType) {
                throw new UnauthorizedError("Invalid token type");
            }

            return payload;
        } catch (error) {
            if (error instanceof UnauthorizedError) throw error;
            if (
                expectedType === "access" &&
                error.name === "TokenExpiredError"
            ) {
                throw new UnauthorizedError("Access token has expired");
            }
            if (expectedType === "access") {
                throw new UnauthorizedError("Invalid access token");
            }
            throw new UnauthorizedError("Invalid or expired refresh token");
        }
    }

    #expiryToMilliseconds(expiry) {
        if (typeof expiry === "number") {
            return expiry * 1000;
        }

        const match = expiry
            .toString()
            .trim()
            .match(/^(\d+)([smhd])$/);
        if (!match) {
            return 24 * 60 * 60 * 1000;
        }

        const [, amount, unit] = match;
        return Number(amount) * secondsByUnit[unit] * 1000;
    }
}

export { TokenService };
