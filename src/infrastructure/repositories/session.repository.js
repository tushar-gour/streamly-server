import { SessionRepository } from "../../domain/repositories/session.repository.js";
import { createId } from "../../shared/helpers/id-generator.js";
import { prisma } from "../database/prisma/client.js";

class PrismaSessionRepository extends SessionRepository {
    createSession(sessionData) {
        return prisma.session.create({
            data: {
                id: sessionData.id || createId(),
                userId: sessionData.userId,
                refreshTokenHash: sessionData.refreshTokenHash,
                userAgent: sessionData.userAgent,
                ipAddress: sessionData.ipAddress,
                expiresAt: sessionData.expiresAt,
            },
        });
    }

    findSessionById(sessionId) {
        return prisma.session.findUnique({ where: { id: sessionId } });
    }

    findValidSession({ sessionId, userId }) {
        return prisma.session.findFirst({
            where: {
                id: sessionId,
                userId,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
        });
    }

    updateSessionTokenHash(sessionId, refreshTokenHash, expiresAt) {
        return prisma.session.update({
            where: { id: sessionId },
            data: {
                refreshTokenHash,
                expiresAt,
                lastUsedAt: new Date(),
            },
        });
    }

    updateSessionLastUsedAt(sessionId) {
        return prisma.session.update({
            where: { id: sessionId },
            data: { lastUsedAt: new Date() },
        });
    }

    revokeSession(sessionId, revokedReason = "logout") {
        return prisma.session.updateMany({
            where: { id: sessionId, revokedAt: null },
            data: {
                revokedAt: new Date(),
                revokedReason,
            },
        });
    }

    revokeAllUserSessions(userId, revokedReason = "logout-all") {
        return prisma.session.updateMany({
            where: { userId, revokedAt: null },
            data: {
                revokedAt: new Date(),
                revokedReason,
            },
        });
    }
}

export { PrismaSessionRepository };
