// @ts-nocheck
import { EmailVerificationTokenRepository } from "../../domain/repositories/email-verification-token.repository.js";
import { createId } from "../../shared/helpers/id-generator.js";
import { prisma } from "../database/prisma/client.js";

class PrismaEmailVerificationTokenRepository extends EmailVerificationTokenRepository {
    createToken(tokenData) {
        return prisma.emailVerificationToken.create({
            data: {
                id: createId(),
                userId: tokenData.userId,
                tokenHash: tokenData.tokenHash,
                expiresAt: tokenData.expiresAt,
            },
        });
    }

    findValidToken(tokenHash) {
        return prisma.emailVerificationToken.findFirst({
            where: {
                tokenHash,
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
        });
    }

    markTokenUsed(tokenId) {
        return prisma.emailVerificationToken.update({
            where: { id: tokenId },
            data: { usedAt: new Date() },
        });
    }

    revokeUnusedUserTokens(userId) {
        return prisma.emailVerificationToken.updateMany({
            where: {
                userId,
                usedAt: null,
            },
            data: { usedAt: new Date() },
        });
    }
}

export { PrismaEmailVerificationTokenRepository };
