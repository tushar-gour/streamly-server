// @ts-nocheck
import { LikeRepository } from "../../domain/repositories/like.repository.js";
import { createId } from "../../shared/helpers/id-generator.js";
import { prisma } from "../database/prisma/client.js";
import { getTargetField, toVideo } from "../database/prisma-record.mapper.js";

const ownerSelect = {
    id: true,
    username: true,
    fullName: true,
    avatar: true,
};

class PrismaLikeRepository extends LikeRepository {
    findByTarget(field, documentId, userId) {
        return prisma.like.findFirst({
            where: {
                [getTargetField(field)]: documentId,
                likedById: userId,
            },
        });
    }

    create(likeData) {
        const data = {
            id: createId(),
            likedById: likeData.likedBy,
        };

        for (const field of ["video", "comment", "tweet"]) {
            if (likeData[field]) {
                data[getTargetField(field)] = likeData[field];
            }
        }

        return prisma.like.create({ data });
    }

    deleteById(likeId) {
        return prisma.like.delete({ where: { id: likeId } });
    }

    deleteMany(filter) {
        const where = {};

        for (const [key, value] of Object.entries(filter)) {
            where[getTargetField(key)] = value;
        }

        return prisma.like.deleteMany({ where });
    }

    countByTarget(field, documentId) {
        return prisma.like.count({
            where: { [getTargetField(field)]: documentId },
        });
    }

    countByVideos(videoIds) {
        return prisma.like.count({
            where: { videoId: { in: videoIds } },
        });
    }

    async toggle({ field, documentId, userId }) {
        const existingLike = await this.findByTarget(field, documentId, userId);

        if (existingLike) {
            await this.deleteById(existingLike.id);
            return { isLiked: false, like: null };
        }

        const like = await this.create({
            [field]: documentId,
            likedBy: userId,
        });
        return { isLiked: true, like };
    }

    async getLikedVideos({ userId, pageNum, limitNum }) {
        const where = {
            likedById: userId,
            videoId: { not: null },
        };

        const [likes, totalDocs] = await Promise.all([
            prisma.like.findMany({
                where,
                include: {
                    video: {
                        include: {
                            owner: { select: ownerSelect },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            prisma.like.count({ where }),
        ]);

        return {
            likedVideos: likes
                .filter((like) => like.video?.isPublished)
                .map((like) => ({
                    ...toVideo(like.video),
                    likedAt: like.createdAt,
                })),
            totalDocs,
        };
    }
}

export { PrismaLikeRepository };
