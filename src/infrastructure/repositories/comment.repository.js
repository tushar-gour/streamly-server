import { CommentRepository } from "../../domain/repositories/comment.repository.js";
import { createId } from "../../shared/helpers/id-generator.js";
import { prisma } from "../database/prisma/client.js";
import { toComment } from "../database/prisma-record.mapper.js";

const ownerSelect = {
    id: true,
    username: true,
    fullName: true,
    avatar: true,
};

class PrismaCommentRepository extends CommentRepository {
    async findById(commentId) {
        return toComment(
            await prisma.comment.findUnique({ where: { id: commentId } })
        );
    }

    async create(commentData) {
        return toComment(
            await prisma.comment.create({
                data: {
                    id: createId(),
                    content: commentData.content,
                    videoId: commentData.video,
                    ownerId: commentData.owner,
                },
                include: { owner: { select: ownerSelect } },
            })
        );
    }

    async findByIdWithOwner(commentId) {
        return toComment(
            await prisma.comment.findUnique({
                where: { id: commentId },
                include: { owner: { select: ownerSelect } },
            })
        );
    }

    async updateByIdWithOwner(commentId, content) {
        return toComment(
            await prisma.comment.update({
                where: { id: commentId },
                data: { content },
                include: { owner: { select: ownerSelect } },
            })
        );
    }

    deleteById(commentId) {
        return prisma.comment.delete({ where: { id: commentId } });
    }

    deleteByVideo(videoId) {
        return prisma.comment.deleteMany({ where: { videoId } });
    }

    countByVideo(videoId) {
        return prisma.comment.count({ where: { videoId } });
    }

    countByVideos(videoIds) {
        return prisma.comment.count({
            where: { videoId: { in: videoIds } },
        });
    }

    async getVideoComments({ videoId, currentUserId, pageNum, limitNum }) {
        const likeInclude = currentUserId
            ? {
                  likes: {
                      where: { likedById: currentUserId },
                      select: { id: true },
                  },
              }
            : {};
        const [comments, totalDocs] = await Promise.all([
            prisma.comment.findMany({
                where: { videoId },
                include: {
                    owner: { select: ownerSelect },
                    ...likeInclude,
                    _count: { select: { likes: true } },
                },
                orderBy: { createdAt: "desc" },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            this.countByVideo(videoId),
        ]);

        return {
            comments: comments.map((comment) => ({
                ...toComment(comment),
                likesCount: comment._count.likes,
                isLiked: currentUserId ? comment.likes?.length > 0 : false,
            })),
            totalDocs,
        };
    }
}

export { PrismaCommentRepository };
