// @ts-nocheck
import {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
} from "../../shared/errors/api-error.js";
import { PaginationDefaults } from "../../shared/constants/index.js";
import { PaginationBuilder } from "../../shared/responses/api-response.js";
import { ObjectIdValidator } from "../../shared/validators/object-id.validator.js";
import { appConfig } from "../../config/env.js";
import { CacheKeys } from "../../infrastructure/cache/cache.keys.js";

class CommentService {
    constructor({
        commentRepository,
        videoRepository,
        likeRepository,
        cacheService,
    }) {
        this.commentRepository = commentRepository;
        this.videoRepository = videoRepository;
        this.likeRepository = likeRepository;
        this.cacheService = cacheService;
    }

    async getVideoComments({ videoId, currentUserId, query }) {
        ObjectIdValidator.ensureValid(videoId, "video ID");

        const { pageNum, limitNum } = this.#getPagination(
            query.page ?? PaginationDefaults.PAGE,
            query.limit ?? PaginationDefaults.LIMIT
        );

        const loadComments = () =>
            this.commentRepository.getVideoComments({
                videoId,
                currentUserId,
                pageNum,
                limitNum,
            });
        const { comments, totalDocs } = currentUserId
            ? await loadComments()
            : await this.cacheService.remember(
                  CacheKeys.videoComments(videoId, {
                      page: pageNum,
                      limit: limitNum,
                  }),
                  appConfig.cache.videoCommentsTtlSeconds,
                  loadComments
              );

        return {
            data: comments,
            pagination: new PaginationBuilder()
                .setPage(pageNum)
                .setLimit(limitNum)
                .setTotalDocs(totalDocs)
                .build(),
            message: "Comments fetched successfully",
        };
    }

    async addComment({ videoId, content, userId }) {
        ObjectIdValidator.ensureValid(videoId, "video ID");

        if (!content?.trim()) {
            throw new BadRequestError("Comment content is required");
        }

        const video = await this.videoRepository.findById(videoId);
        if (!video) {
            throw new NotFoundError("Video", videoId);
        }

        const comment = await this.commentRepository.create({
            content: content.trim(),
            video: videoId,
            owner: userId,
        });

        const createdComment = await this.commentRepository.findByIdWithOwner(
            comment._id
        );

        await this.#invalidateVideoCommentCache(videoId);

        return {
            statusCode: 201,
            data: createdComment,
            message: "Comment added successfully",
        };
    }

    async updateComment({ commentId, content, userId }) {
        ObjectIdValidator.ensureValid(commentId, "comment ID");

        if (!content?.trim()) {
            throw new BadRequestError("Comment content is required");
        }

        const comment = await this.#findCommentOrFail(commentId);
        this.#verifyOwnership(comment, userId);

        const updatedComment = await this.commentRepository.updateByIdWithOwner(
            commentId,
            content.trim()
        );

        await this.#invalidateAllCommentCache();

        return {
            data: updatedComment,
            message: "Comment updated successfully",
        };
    }

    async deleteComment({ commentId, userId }) {
        ObjectIdValidator.ensureValid(commentId, "comment ID");

        const comment = await this.#findCommentOrFail(commentId);
        this.#verifyOwnership(comment, userId);

        await Promise.all([
            this.commentRepository.deleteById(commentId),
            this.likeRepository.deleteMany({ comment: commentId }),
        ]);

        await this.#invalidateAllCommentCache();

        return { data: {}, message: "Comment deleted successfully" };
    }

    async #invalidateVideoCommentCache(videoId) {
        await Promise.all([
            this.cacheService.deleteByPattern(
                CacheKeys.videoCommentsPattern(videoId)
            ),
            this.cacheService.deleteByPattern(
                CacheKeys.videoDetailPattern(videoId)
            ),
            this.cacheService.deleteByPattern(CacheKeys.videoListPattern()),
        ]);
    }

    async #invalidateAllCommentCache() {
        await Promise.all([
            this.cacheService.deleteByPattern(CacheKeys.videoCommentsPattern()),
            this.cacheService.deleteByPattern(CacheKeys.videoDetailPattern()),
            this.cacheService.deleteByPattern(CacheKeys.videoListPattern()),
        ]);
    }

    async #findCommentOrFail(commentId) {
        const comment = await this.commentRepository.findById(commentId);
        if (!comment) {
            throw new NotFoundError("Comment", commentId);
        }
        return comment;
    }

    #verifyOwnership(comment, userId) {
        if (comment.owner.toString() !== userId.toString()) {
            throw new ForbiddenError(
                "You are not authorized to modify this comment"
            );
        }
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
}

export { CommentService };
