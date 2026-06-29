// @ts-nocheck
import { NotFoundError } from "../../shared/errors/api-error.js";
import { PaginationDefaults } from "../../shared/constants/index.js";
import { PaginationBuilder } from "../../shared/responses/api-response.js";
import { ObjectIdValidator } from "../../shared/validators/object-id.validator.js";
import { CacheKeys } from "../../infrastructure/cache/cache.keys.js";

class LikeService {
    constructor({
        likeRepository,
        videoRepository,
        commentRepository,
        cacheService,
    }) {
        this.likeRepository = likeRepository;
        this.videoRepository = videoRepository;
        this.commentRepository = commentRepository;
        this.cacheService = cacheService;
    }

    toggleVideoLike({ videoId, userId }) {
        return this.#toggleTargetLike({
            field: "video",
            documentId: videoId,
            userId,
            fieldName: "video ID",
            notFoundResource: "Video",
            exists: () => this.videoRepository.findById(videoId),
            likedMessage: "Video liked successfully",
            unlikedMessage: "Video unliked successfully",
        });
    }

    toggleCommentLike({ commentId, userId }) {
        return this.#toggleTargetLike({
            field: "comment",
            documentId: commentId,
            userId,
            fieldName: "comment ID",
            notFoundResource: "Comment",
            exists: () => this.commentRepository.findById(commentId),
            likedMessage: "Comment liked successfully",
            unlikedMessage: "Comment unliked successfully",
        });
    }

    toggleTweetLike({ tweetId, userId }) {
        return this.#toggleTargetLike({
            field: "tweet",
            documentId: tweetId,
            userId,
            fieldName: "tweet ID",
            likedMessage: "Tweet liked successfully",
            unlikedMessage: "Tweet unliked successfully",
        });
    }

    async getLikedVideos({ userId, query }) {
        const { pageNum, limitNum } = this.#getPagination(
            query.page ?? PaginationDefaults.PAGE,
            query.limit ?? PaginationDefaults.LIMIT
        );

        const { likedVideos, totalDocs } =
            await this.likeRepository.getLikedVideos({
                userId,
                pageNum,
                limitNum,
            });

        return {
            data: likedVideos,
            pagination: new PaginationBuilder()
                .setPage(pageNum)
                .setLimit(limitNum)
                .setTotalDocs(totalDocs)
                .build(),
            message: "Liked videos fetched successfully",
        };
    }

    async #toggleTargetLike(options) {
        const {
            field,
            documentId,
            userId,
            fieldName,
            notFoundResource,
            exists,
            likedMessage,
            unlikedMessage,
        } = options;

        ObjectIdValidator.ensureValid(documentId, fieldName);

        if (exists) {
            const document = await exists();
            if (!document) {
                throw new NotFoundError(notFoundResource, documentId);
            }
        }

        const { isLiked } = await this.likeRepository.toggle({
            field,
            documentId,
            userId,
        });
        await this.#invalidateLikeTargetCache(field, documentId);

        return {
            statusCode: isLiked ? 201 : 200,
            data: {
                isLiked,
                likesCount: await this.likeRepository.countByTarget(
                    field,
                    documentId
                ),
            },
            message: isLiked ? likedMessage : unlikedMessage,
        };
    }

    #getPagination(page, limit) {
        return {
            pageNum: Math.max(1, parseInt(page, 10)),
            limitNum: Math.min(
                Math.max(1, parseInt(limit, 10)),
                PaginationDefaults.MAX_LIMIT
            ),
        };
    }

    async #invalidateLikeTargetCache(field, documentId) {
        if (field === "video") {
            await Promise.all([
                this.cacheService.deleteByPattern(
                    CacheKeys.videoDetailPattern(documentId)
                ),
                this.cacheService.deleteByPattern(
                    CacheKeys.videoCommentsPattern(documentId)
                ),
                this.cacheService.deleteByPattern(CacheKeys.videoListPattern()),
            ]);
            return;
        }

        if (field === "comment") {
            await Promise.all([
                this.cacheService.deleteByPattern(
                    CacheKeys.videoCommentsPattern()
                ),
                this.cacheService.deleteByPattern(
                    CacheKeys.videoDetailPattern()
                ),
                this.cacheService.deleteByPattern(CacheKeys.videoListPattern()),
            ]);
        }
    }
}

export { LikeService };
