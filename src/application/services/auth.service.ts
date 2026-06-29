// @ts-nocheck
import {
    ApiError,
    NotFoundError,
    UnauthorizedError,
} from "../../shared/errors/api-error.js";
import { CookieOptions } from "../../shared/constants/index.js";
import { isProduction } from "../../config/env.js";
import { audit } from "../../infrastructure/logger/audit-logger.js";

class AuthService {
    constructor({ userRepository, sessionRepository, tokenService }) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.tokenService = tokenService;
    }

    getCookieOptions() {
        return {
            ...CookieOptions,
            secure: isProduction(),
        };
    }

    getRefreshCookieOptions() {
        return {
            ...this.getCookieOptions(),
            maxAge: this.tokenService.getRefreshCookieMaxAge(),
        };
    }

    async createLoginSession({ user, userAgent, ipAddress }) {
        try {
            const sessionId = this.tokenService.createSessionId();
            const accessToken = this.tokenService.generateAccessToken(
                user,
                sessionId
            );
            const refreshToken = this.tokenService.generateRefreshToken(
                user,
                sessionId
            );

            await this.sessionRepository.createSession({
                id: sessionId,
                userId: user._id,
                refreshTokenHash: this.tokenService.hashToken(refreshToken),
                userAgent,
                ipAddress,
                expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
            });
            await this.userRepository.updateLastLoginAt(user._id);

            return { accessToken, refreshToken, sessionId };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            audit.error("auth.session_create_failed", {
                userId: user?._id,
            });
            throw new ApiError(500, "Failed to create authentication session");
        }
    }

    async refreshSession(refreshToken) {
        if (!refreshToken) {
            throw new UnauthorizedError("Refresh token is required");
        }

        const decodedToken = this.tokenService.verifyRefreshToken(refreshToken);
        const session = await this.sessionRepository.findValidSession({
            sessionId: decodedToken.sessionId,
            userId: decodedToken._id,
        });

        if (!session) {
            audit.warn("auth.refresh_rejected", {
                userId: decodedToken._id,
                reason: "invalid-session",
            });
            throw new UnauthorizedError("Invalid or expired refresh token");
        }

        if (
            !this.tokenService.compareTokenHash(
                refreshToken,
                session.refreshTokenHash
            )
        ) {
            await this.sessionRepository.revokeAllUserSessions(
                decodedToken._id,
                "refresh-token-reuse-detected"
            );
            audit.warn("auth.refresh_token_reuse_detected", {
                userId: decodedToken._id,
                sessionId: session.id,
            });
            throw new UnauthorizedError("Refresh token has been revoked");
        }

        const user = await this.userRepository.findPublicById(decodedToken._id);
        if (!user) {
            throw new NotFoundError("User", decodedToken._id);
        }

        const accessToken = this.tokenService.generateAccessToken(
            user,
            session.id
        );
        const newRefreshToken = this.tokenService.generateRefreshToken(
            user,
            session.id
        );

        await this.sessionRepository.updateSessionTokenHash(
            session.id,
            this.tokenService.hashToken(newRefreshToken),
            this.tokenService.getRefreshTokenExpiresAt()
        );

        audit.info("auth.refresh_rotated", {
            userId: user._id,
            sessionId: session.id,
        });

        return {
            user,
            accessToken,
            refreshToken: newRefreshToken,
            sessionId: session.id,
        };
    }

    async revokeSession(sessionId, reason = "logout") {
        if (!sessionId) return;
        await this.sessionRepository.revokeSession(sessionId, reason);
        audit.info("auth.session_revoked", { sessionId, reason });
    }

    async revokeAllUserSessions(userId, reason = "logout-all") {
        await this.sessionRepository.revokeAllUserSessions(userId, reason);
        audit.info("auth.sessions_revoked", { userId, reason });
    }

    async verifyAccessToken(token) {
        if (!token) {
            throw new UnauthorizedError("Access token is required");
        }

        const decodedToken = this.tokenService.verifyAccessToken(token);
        const user = await this.userRepository.findPublicById(decodedToken._id);

        if (!user) {
            throw new UnauthorizedError(
                "Invalid access token - user not found"
            );
        }

        return { user, sessionId: decodedToken.sessionId };
    }

    async verifyRefreshToken(refreshToken) {
        if (!refreshToken) {
            throw new UnauthorizedError("Refresh token is required");
        }

        const decodedToken = this.tokenService.verifyRefreshToken(refreshToken);
        const session = await this.sessionRepository.findValidSession({
            sessionId: decodedToken.sessionId,
            userId: decodedToken._id,
        });

        if (
            !session ||
            !this.tokenService.compareTokenHash(
                refreshToken,
                session.refreshTokenHash
            )
        ) {
            throw new UnauthorizedError("Invalid or expired refresh token");
        }

        const user = await this.userRepository.findPublicById(decodedToken._id);
        if (!user) {
            throw new UnauthorizedError(
                "Invalid refresh token - user not found"
            );
        }

        return user;
    }
}

export { AuthService };
