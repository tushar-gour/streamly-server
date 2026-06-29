// @ts-nocheck
import {
    ApiError,
    BadRequestError,
    ForbiddenError,
    NotFoundError,
} from "../../shared/errors/api-error.js";
import {
    PaginationDefaults,
    SuccessMessages,
} from "../../shared/constants/index.js";
import { PaginationBuilder } from "../../shared/responses/api-response.js";
import { ObjectIdValidator } from "../../shared/validators/object-id.validator.js";
import { createLogger } from "../../infrastructure/logger/logger.js";
import { appConfig } from "../../config/env.js";
import { CacheKeys } from "../../infrastructure/cache/cache.keys.js";

const videoServiceLogger = createLogger("video-service");

class VideoService {
    constructor({
        videoRepository,
        userRepository,
        likeRepository,
        commentRepository,
        cloudinaryService,
        cacheService,
        authorizationService,
        mediaStreamService,
    }) {
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
        this.cloudinaryService = cloudinaryService;
        this.cacheService = cacheService;
        this.authorizationService = authorizationService;
        this.mediaStreamService = mediaStreamService;
    }

    async getAll(queryParams) {
        const {
            page = PaginationDefaults.PAGE,
            limit = PaginationDefaults.LIMIT,
            query,
            sortBy = "createdAt",
            sortType = "desc",
            userId,
        } = queryParams;

        const { pageNum, limitNum } = this.#getPagination(page, limit);
        if (userId) ObjectIdValidator.ensureValid(userId, "user ID");

        const cacheKey = CacheKeys.videoList({
            page: pageNum,
            limit: limitNum,
            query,
            sortBy,
            sortType,
            userId,
        });
        const { videos, totalDocs } = await this.cacheService.remember(
            cacheKey,
            appConfig.cache.videoListTtlSeconds,
            () =>
                this.videoRepository.getPublishedVideos({
                    pageNum,
                    limitNum,
                    query,
                    sortBy,
                    sortType,
                    userId,
                })
        );

        return {
            data: videos,
            pagination: new PaginationBuilder()
                .setPage(pageNum)
                .setLimit(limitNum)
                .setTotalDocs(totalDocs)
                .build(),
            message: SuccessMessages.VIDEO_FETCHED,
        };
    }

    async getById({ videoId, currentUserId }) {
        ObjectIdValidator.ensureValid(videoId, "video ID");

        const loadVideoDetails = async () => {
            const videos = await this.videoRepository.getVideoDetails(
                videoId,
                currentUserId
            );

            if (!videos?.length) {
                throw new NotFoundError("Video", videoId);
            }

            return videos[0];
        };

        const video = await loadVideoDetails();

        await this.videoRepository.incrementViews(videoId);

        if (currentUserId) {
            await this.userRepository.addToWatchHistory(currentUserId, videoId);
        }

        return { data: video, message: SuccessMessages.VIDEO_FETCHED };
    }

    async #invalidateVideoCache(videoId) {
        await Promise.all([
            this.cacheService.deleteByPattern(CacheKeys.videoListPattern()),
            this.cacheService.deleteByPattern(
                CacheKeys.videoDetailPattern(videoId)
            ),
            this.cacheService.deleteByPattern(
                CacheKeys.videoCommentsPattern(videoId)
            ),
        ]);
    }

    async #invalidateAllVideoCache() {
        await Promise.all([
            this.cacheService.deleteByPattern(CacheKeys.videoListPattern()),
            this.cacheService.deleteByPattern(CacheKeys.videoDetailPattern()),
            this.cacheService.deleteByPattern(CacheKeys.videoCommentsPattern()),
        ]);
    }

    async publish({ body, files, ownerId }) {
        const { title, description } = body;

        if (!title?.trim() || !description?.trim()) {
            throw new BadRequestError("Title and description are required");
        }

        const videoFile = files?.videoFile?.[0];
        const thumbnailFile = files?.thumbnail?.[0];

        if (!videoFile) {
            throw new BadRequestError("Video file is required");
        }

        if (!thumbnailFile) {
            throw new BadRequestError("Thumbnail image is required");
        }

        const [videoUpload, thumbnailUpload] = await Promise.all([
            this.cloudinaryService.upload(videoFile.path, {
                resource_type: "video",
            }),
            this.cloudinaryService.upload(thumbnailFile.path),
        ]);

        if (!videoUpload) {
            throw new ApiError(500, "Failed to upload video");
        }

        if (!thumbnailUpload) {
            throw new ApiError(500, "Failed to upload thumbnail");
        }

        const video = await this.videoRepository.create({
            title: title.trim(),
            description: description.trim(),
            videoFile: videoUpload.secureUrl || videoUpload.url,
            thumbnail: thumbnailUpload.secureUrl || thumbnailUpload.url,
            duration: videoUpload.duration || 0,
            owner: ownerId,
            isPublished: true,
        });

        const publishedVideo = await this.videoRepository.findByIdWithOwner(
            video._id
        );

        await this.#invalidateAllVideoCache();

        return {
            statusCode: 201,
            data: publishedVideo,
            message: SuccessMessages.VIDEO_CREATED,
        };
    }

    async update({ videoId, body, file, userId }) {
        ObjectIdValidator.ensureValid(videoId, "video ID");

        const video = await this.#findVideoOrFail(videoId);
        this.#verifyOwnership(video, userId);

        const updateData = {};
        if (body.title?.trim()) updateData.title = body.title.trim();
        if (body.description?.trim())
            updateData.description = body.description.trim();

        if (file) {
            const oldThumbnailPublicId = this.cloudinaryService.extractPublicId(
                video.thumbnail
            );
            const thumbnailUpload = await this.cloudinaryService.upload(
                file.path
            );

            if (!thumbnailUpload) {
                throw new ApiError(500, "Failed to upload new thumbnail");
            }

            updateData.thumbnail =
                thumbnailUpload.secureUrl || thumbnailUpload.url;

            if (oldThumbnailPublicId) {
                this.cloudinaryService
                    .delete(oldThumbnailPublicId)
                    .catch((error) =>
                        videoServiceLogger.warn(
                            { error: { message: error.message } },
                            "failed to delete old thumbnail"
                        )
                    );
            }
        }

        if (Object.keys(updateData).length === 0) {
            throw new BadRequestError(
                "At least one field is required to update"
            );
        }

        const updatedVideo = await this.videoRepository.updateByIdWithOwner(
            videoId,
            updateData
        );

        await this.#invalidateVideoCache(videoId);

        return { data: updatedVideo, message: SuccessMessages.VIDEO_UPDATED };
    }

    async delete({ videoId, userId }) {
        ObjectIdValidator.ensureValid(videoId, "video ID");

        const video = await this.#findVideoOrFail(videoId);
        this.#verifyOwnership(video, userId);

        const videoPublicId = this.cloudinaryService.extractPublicId(
            video.videoFile
        );
        const thumbnailPublicId = this.cloudinaryService.extractPublicId(
            video.thumbnail
        );

        await this.videoRepository.deleteById(videoId);
        await Promise.all([
            this.likeRepository.deleteMany({ video: videoId }),
            this.commentRepository.deleteByVideo(videoId),
        ]);

        Promise.all([
            videoPublicId &&
                this.cloudinaryService.delete(videoPublicId, "video"),
            thumbnailPublicId &&
                this.cloudinaryService.delete(thumbnailPublicId),
        ]).catch((error) =>
            videoServiceLogger.warn(
                { error: { message: error.message } },
                "failed to cleanup video files"
            )
        );

        await this.#invalidateVideoCache(videoId);

        return { data: {}, message: SuccessMessages.VIDEO_DELETED };
    }

    async togglePublish({ videoId, userId }) {
        ObjectIdValidator.ensureValid(videoId, "video ID");

        const video = await this.#findVideoOrFail(videoId);
        this.#verifyOwnership(video, userId);

        const updatedVideo = await this.videoRepository.updateByIdWithOwner(
            videoId,
            { isPublished: !video.isPublished }
        );

        const message = updatedVideo.isPublished
            ? "Video published successfully"
            : "Video unpublished successfully";

        await this.#invalidateVideoCache(videoId);

        return { data: updatedVideo, message };
    }

    async stream({ videoId, currentUserId, range }) {
        ObjectIdValidator.ensureValid(videoId, "video ID");

        if (!appConfig.media.videoStreamingEnabled) {
            throw new ApiError(503, "Video streaming is disabled");
        }

        const video = await this.#findVideoOrFail(videoId);

        if (!video.isPublished) {
            if (!currentUserId) {
                throw new ApiError(
                    401,
                    "Authentication required to stream this video"
                );
            }

            const ownsVideo =
                video.owner?.toString() === currentUserId.toString();
            const canStreamPrivateVideo =
                await this.authorizationService.hasAnyPermission(
                    currentUserId,
                    [
                        "video:update:any",
                        "video:delete:any",
                        "video:publish:any",
                    ]
                );

            if (!ownsVideo && !canStreamPrivateVideo) {
                throw new ForbiddenError(
                    "You are not authorized to stream this video"
                );
            }
        }

        return this.mediaStreamService.streamVideo(video.videoFile, range);
    }

    async #findVideoOrFail(videoId) {
        const video = await this.videoRepository.findById(videoId);
        if (!video) {
            throw new NotFoundError("Video", videoId);
        }
        return video;
    }

    #verifyOwnership(video, userId) {
        if (video.owner.toString() !== userId.toString()) {
            throw new ForbiddenError(
                "You are not authorized to modify this video"
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

export { VideoService };
