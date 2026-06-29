import { VideoRepository } from "../../domain/repositories/video.repository.js";
import { createId } from "../../shared/helpers/id-generator.js";
import { prisma } from "../database/prisma/client.js";
import {
    normalizeMongoUpdate,
    toVideo,
    withId,
} from "../database/prisma-record.mapper.js";

const ownerSelect = {
    id: true,
    username: true,
    fullName: true,
    avatar: true,
};

const videoInclude = {
    owner: { select: ownerSelect },
};

const sortableVideoFields = new Set([
    "createdAt",
    "updatedAt",
    "title",
    "views",
    "duration",
]);

class PrismaVideoRepository extends VideoRepository {
    async findById(videoId) {
        return toVideo(
            await prisma.video.findUnique({ where: { id: videoId } })
        );
    }

    async create(videoData) {
        return toVideo(
            await prisma.video.create({
                data: {
                    id: createId(),
                    title: videoData.title,
                    description: videoData.description,
                    videoFile: videoData.videoFile,
                    thumbnail: videoData.thumbnail,
                    duration: videoData.duration,
                    ownerId: videoData.owner,
                    isPublished: videoData.isPublished,
                },
                include: videoInclude,
            })
        );
    }

    async findByIdWithOwner(videoId) {
        return toVideo(
            await prisma.video.findUnique({
                where: { id: videoId },
                include: videoInclude,
            })
        );
    }

    async updateByIdWithOwner(videoId, updateData) {
        return toVideo(
            await prisma.video.update({
                where: { id: videoId },
                data: normalizeMongoUpdate(updateData),
                include: videoInclude,
            })
        );
    }

    deleteById(videoId) {
        return prisma.video.delete({ where: { id: videoId } });
    }

    incrementViews(videoId) {
        return prisma.video.update({
            where: { id: videoId },
            data: { views: { increment: 1 } },
        });
    }

    count(matchStage) {
        return prisma.video.count({
            where: this.#toWhere(matchStage),
        });
    }

    async getPublishedVideos(params) {
        const { pageNum, limitNum, query, sortBy, sortType, userId } = params;
        const where = {
            isPublished: true,
            ...(query && {
                OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    { description: { contains: query, mode: "insensitive" } },
                ],
            }),
            ...(userId && { ownerId: userId }),
        };

        const [videos, totalDocs] = await Promise.all([
            prisma.video.findMany({
                where,
                include: {
                    owner: { select: ownerSelect },
                    _count: { select: { likes: true, comments: true } },
                },
                orderBy: {
                    [this.#toSortField(sortBy)]:
                        sortType === "asc" ? "asc" : "desc",
                },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            prisma.video.count({ where }),
        ]);

        return {
            videos: videos.map((video) => ({
                ...toVideo(video),
                likesCount: video._count.likes,
                commentsCount: video._count.comments,
            })),
            totalDocs,
        };
    }

    async getVideoDetails(videoId, currentUserId = null) {
        const likeInclude = currentUserId
            ? {
                  likes: {
                      where: { likedById: currentUserId },
                      select: { id: true },
                  },
              }
            : {};
        const video = await prisma.video.findUnique({
            where: { id: videoId },
            include: {
                owner: { select: ownerSelect },
                ...likeInclude,
                _count: { select: { likes: true, comments: true } },
            },
        });

        if (!video) return [];

        return [
            {
                ...toVideo(video),
                likesCount: video._count.likes,
                commentsCount: video._count.comments,
                ...(currentUserId && {
                    isLiked: video.likes?.length > 0,
                }),
            },
        ];
    }

    async getDashboardVideos(params) {
        const { channelId, pageNum, limitNum, sortBy, sortType, isPublished } =
            params;
        const where = {
            ownerId: channelId,
            ...(isPublished !== undefined && {
                isPublished: isPublished === "true",
            }),
        };

        const [videos, totalDocs] = await Promise.all([
            prisma.video.findMany({
                where,
                include: {
                    _count: { select: { likes: true, comments: true } },
                },
                orderBy: {
                    [this.#toSortField(sortBy)]:
                        sortType === "asc" ? "asc" : "desc",
                },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            prisma.video.count({ where }),
        ]);

        return [
            videos.map((video) => ({
                ...withId(video),
                likesCount: video._count.likes,
                commentsCount: video._count.comments,
            })),
            totalDocs,
        ];
    }

    async getTotalViewsByOwner(ownerId) {
        const result = await prisma.video.aggregate({
            where: { ownerId },
            _sum: { views: true },
        });

        return [{ totalViews: result._sum.views || 0 }];
    }

    async getVideoIdsByOwner(ownerId) {
        const videos = await prisma.video.findMany({
            where: { ownerId },
            select: { id: true },
        });

        return videos.map((video) => video.id);
    }

    #toWhere(matchStage = {}) {
        return {
            ...(matchStage.owner && { ownerId: matchStage.owner }),
            ...(matchStage.isPublished !== undefined && {
                isPublished: matchStage.isPublished,
            }),
        };
    }

    #toSortField(sortBy) {
        return sortableVideoFields.has(sortBy) ? sortBy : "createdAt";
    }
}

export { PrismaVideoRepository };
