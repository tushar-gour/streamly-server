// @ts-nocheck
import bcrypt from "bcrypt";

import { isProduction } from "../../config/env.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import { createId } from "../../shared/helpers/id-generator.js";
import { prisma } from "../database/prisma/client.js";
import {
    attachUserMethods,
    normalizeMongoUpdate,
    toPublicUser,
    toVideo,
    withId,
} from "../database/prisma-record.mapper.js";

class PrismaUserRepository extends UserRepository {
    async findById(userId) {
        return toPublicUser(
            await prisma.user.findUnique({ where: { id: userId } })
        );
    }

    async findPublicById(userId) {
        return this.findById(userId);
    }

    async findByIdWithPassword(userId) {
        return attachUserMethods(
            withId(await prisma.user.findUnique({ where: { id: userId } }))
        );
    }

    async findByIdWithRefreshToken(userId) {
        return attachUserMethods(
            withId(await prisma.user.findUnique({ where: { id: userId } }))
        );
    }

    async findByCredentials(identifier) {
        const normalizedIdentifier = identifier.toLowerCase();
        return attachUserMethods(
            withId(
                await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: normalizedIdentifier },
                            { username: normalizedIdentifier },
                        ],
                    },
                })
            )
        );
    }

    async findByUsernameOrEmail(username, email) {
        return toPublicUser(
            await prisma.user.findFirst({
                where: {
                    OR: [
                        { username: username.toLowerCase() },
                        { email: email.toLowerCase() },
                    ],
                },
            })
        );
    }

    async findByEmailExcludingUser(email, userId) {
        return toPublicUser(
            await prisma.user.findFirst({
                where: {
                    email: email.toLowerCase(),
                    id: { not: userId },
                },
            })
        );
    }

    async createUser(userData) {
        const saltRounds = isProduction() ? 12 : 10;
        const user = await prisma.user.create({
            data: {
                id: createId(),
                username: userData.username,
                email: userData.email,
                fullName: userData.fullName,
                password: await bcrypt.hash(userData.password, saltRounds),
                avatar: userData.avatar,
                coverImage: userData.coverImage || "",
            },
        });

        return toPublicUser(user);
    }

    async updateById(userId, updateData) {
        return toPublicUser(
            await prisma.user.update({
                where: { id: userId },
                data: normalizeMongoUpdate(updateData),
            })
        );
    }

    async updatePassword(userId, password) {
        const saltRounds = isProduction() ? 12 : 10;
        return prisma.user.update({
            where: { id: userId },
            data: {
                password: await bcrypt.hash(password, saltRounds),
            },
        });
    }

    clearRefreshToken(userId) {
        return this.findById(userId);
    }

    async saveRefreshToken(userId) {
        return attachUserMethods(
            withId(await prisma.user.findUnique({ where: { id: userId } }))
        );
    }

    updateLastLoginAt(userId) {
        return prisma.user.update({
            where: { id: userId },
            data: { lastLoginAt: new Date() },
        });
    }

    async markEmailVerified(userId) {
        return toPublicUser(
            await prisma.user.update({
                where: { id: userId },
                data: { emailVerifiedAt: new Date() },
            })
        );
    }

    async getChannelProfile(username, currentUserId = null) {
        const channel = await prisma.user.findUnique({
            where: { username: username.toLowerCase() },
            include: {
                subscribers: true,
                subscribedTo: true,
            },
        });

        if (!channel) return [];

        return [
            {
                _id: channel.id,
                username: channel.username,
                fullName: channel.fullName,
                email: channel.email,
                avatar: channel.avatar,
                coverImage: channel.coverImage,
                subscribersCount: channel.subscribers.length,
                subscribedToCount: channel.subscribedTo.length,
                isSubscribed: currentUserId
                    ? channel.subscribers.some(
                          (subscription) =>
                              subscription.subscriberId === currentUserId
                      )
                    : false,
                createdAt: channel.createdAt,
            },
        ];
    }

    async getWatchHistory(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                watchHistory: {
                    include: {
                        video: {
                            include: {
                                owner: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        return [
            {
                watchHistory:
                    user?.watchHistory.map((entry) => toVideo(entry.video)) ||
                    [],
            },
        ];
    }

    addToWatchHistory(userId, videoId) {
        return prisma.watchHistory.upsert({
            where: {
                userId_videoId: {
                    userId,
                    videoId,
                },
            },
            create: {
                userId,
                videoId,
            },
            update: {},
        });
    }
}

export { PrismaUserRepository };
