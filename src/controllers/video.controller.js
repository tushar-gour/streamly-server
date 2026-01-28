import mongoose, { isValidObjectId } from "mongoose";

import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import {
    ApiError,
    BadRequestError,
    NotFoundError,
    ForbiddenError,
} from "../utils/ApiError.js";
import { ApiResponse, PaginationBuilder } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
    cloudinaryService,
} from "../utils/cloudinary.js";
import { PaginationDefaults, SuccessMessages } from "../constants.js";

class VideoController {
    static #validateObjectId(id, fieldName = "ID") {
        if (!id || !isValidObjectId(id)) {
            throw new BadRequestError(`Invalid ${fieldName}`);
        }
    }

    static async #findVideoOrFail(videoId) {
        const video = await Video.findById(videoId);
        if (!video) {
            throw new NotFoundError("Video", videoId);
        }
        return video;
    }

    static #verifyOwnership(video, userId) {
        if (video.owner.toString() !== userId.toString()) {
            throw new ForbiddenError(
                "You are not authorized to modify this video"
            );
        }
    }

    static #buildVideoPipeline(options = {}) {
        const {
            matchStage = {},
            includeOwner = true,
            includeStats = true,
        } = options;

        const pipeline = [];

        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }

        if (includeOwner) {
            pipeline.push(
                {
                    $lookup: {
                        from: "users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner",
                        pipeline: [
                            {
                                $project: {
                                    _id: 1,
                                    username: 1,
                                    fullName: 1,
                                    avatar: 1,
                                },
                            },
                        ],
                    },
                },
                {
                    $addFields: {
                        owner: { $first: "$owner" },
                    },
                }
            );
        }

        if (includeStats) {
            pipeline.push(
                {
                    $lookup: {
                        from: "likes",
                        localField: "_id",
                        foreignField: "video",
                        as: "likes",
                    },
                },
                {
                    $lookup: {
                        from: "comments",
                        localField: "_id",
                        foreignField: "video",
                        as: "comments",
                    },
                },
                {
                    $addFields: {
                        likesCount: { $size: "$likes" },
                        commentsCount: { $size: "$comments" },
                    },
                },
                {
                    $project: {
                        likes: 0,
                        comments: 0,
                    },
                }
            );
        }

        return pipeline;
    }

    static getAll = asyncHandler(async (req, res) => {
        const {
            page = PaginationDefaults.PAGE,
            limit = PaginationDefaults.LIMIT,
            query,
            sortBy = "createdAt",
            sortType = "desc",
            userId,
        } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(
            Math.max(1, parseInt(limit, 10)),
            PaginationDefaults.MAX_LIMIT
        );

        const matchStage = { isPublished: true };

        if (query) {
            matchStage.$or = [
                { title: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } },
            ];
        }

        if (userId && isValidObjectId(userId)) {
            matchStage.owner = new mongoose.Types.ObjectId(userId);
        }

        const pipeline = VideoController.#buildVideoPipeline({ matchStage });

        const sortOrder = sortType === "asc" ? 1 : -1;
        pipeline.push({ $sort: { [sortBy]: sortOrder } });

        const countPipeline = [{ $match: matchStage }, { $count: "total" }];
        const countResult = await Video.aggregate(countPipeline);
        const totalDocs = countResult[0]?.total || 0;

        pipeline.push(
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum }
        );

        const videos = await Video.aggregate(pipeline);

        const pagination = new PaginationBuilder()
            .setPage(pageNum)
            .setLimit(limitNum)
            .setTotalDocs(totalDocs)
            .build();

        return res
            .status(200)
            .json(
                ApiResponse.paginated(
                    videos,
                    pagination,
                    SuccessMessages.VIDEO_FETCHED
                )
            );
    });

    static getById = asyncHandler(async (req, res) => {
        const { videoId } = req.params;

        VideoController.#validateObjectId(videoId, "video ID");

        const pipeline = [
            { $match: { _id: new mongoose.Types.ObjectId(videoId) } },
            ...VideoController.#buildVideoPipeline({}),
        ];

        if (req.user) {
            pipeline.push({
                $addFields: {
                    isLiked: {
                        $cond: {
                            if: {
                                $gt: [
                                    {
                                        $size: {
                                            $filter: {
                                                input: {
                                                    $ifNull: ["$likes", []],
                                                },
                                                as: "like",
                                                cond: {
                                                    $eq: [
                                                        "$$like.likedBy",
                                                        new mongoose.Types.ObjectId(
                                                            req.user._id
                                                        ),
                                                    ],
                                                },
                                            },
                                        },
                                    },
                                    0,
                                ],
                            },
                            then: true,
                            else: false,
                        },
                    },
                },
            });
        }

        const videos = await Video.aggregate(pipeline);

        if (!videos?.length) {
            throw new NotFoundError("Video", videoId);
        }

        const video = videos[0];

        await Video.findByIdAndUpdate(videoId, {
            $inc: { views: 1 },
        });

        if (req.user) {
            await User.findByIdAndUpdate(req.user._id, {
                $addToSet: { watchHistory: videoId },
            });
        }

        return res
            .status(200)
            .json(ApiResponse.success(video, SuccessMessages.VIDEO_FETCHED));
    });

    static publish = asyncHandler(async (req, res) => {
        const { title, description } = req.body;

        if (!title?.trim() || !description?.trim()) {
            throw new BadRequestError("Title and description are required");
        }

        const videoFile = req.files?.videoFile?.[0];
        const thumbnailFile = req.files?.thumbnail?.[0];

        if (!videoFile) {
            throw new BadRequestError("Video file is required");
        }

        if (!thumbnailFile) {
            throw new BadRequestError("Thumbnail image is required");
        }

        const [videoUpload, thumbnailUpload] = await Promise.all([
            uploadOnCloudinary(videoFile.path, { resource_type: "video" }),
            uploadOnCloudinary(thumbnailFile.path),
        ]);

        if (!videoUpload) {
            throw new ApiError(500, "Failed to upload video");
        }

        if (!thumbnailUpload) {
            throw new ApiError(500, "Failed to upload thumbnail");
        }

        const video = await Video.create({
            title: title.trim(),
            description: description.trim(),
            videoFile: videoUpload.secureUrl || videoUpload.url,
            thumbnail: thumbnailUpload.secureUrl || thumbnailUpload.url,
            duration: videoUpload.duration || 0,
            owner: req.user._id,
            isPublished: true,
        });

        const publishedVideo = await Video.findById(video._id).populate({
            path: "owner",
            select: "_id username fullName avatar",
        });

        return res
            .status(201)
            .json(
                ApiResponse.created(
                    publishedVideo,
                    SuccessMessages.VIDEO_CREATED
                )
            );
    });

    static update = asyncHandler(async (req, res) => {
        const { videoId } = req.params;
        const { title, description } = req.body;

        VideoController.#validateObjectId(videoId, "video ID");

        const video = await VideoController.#findVideoOrFail(videoId);
        VideoController.#verifyOwnership(video, req.user._id);

        const updateData = {};
        if (title?.trim()) updateData.title = title.trim();
        if (description?.trim()) updateData.description = description.trim();

        if (req.file) {
            const oldThumbnailPublicId = cloudinaryService.extractPublicId(
                video.thumbnail
            );

            const thumbnailUpload = await uploadOnCloudinary(req.file.path);
            if (!thumbnailUpload) {
                throw new ApiError(500, "Failed to upload new thumbnail");
            }

            updateData.thumbnail =
                thumbnailUpload.secureUrl || thumbnailUpload.url;

            if (oldThumbnailPublicId) {
                deleteFromCloudinary(oldThumbnailPublicId).catch((err) =>
                    console.warn("Failed to delete old thumbnail:", err.message)
                );
            }
        }

        if (Object.keys(updateData).length === 0) {
            throw new BadRequestError(
                "At least one field is required to update"
            );
        }

        const updatedVideo = await Video.findByIdAndUpdate(
            videoId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate({
            path: "owner",
            select: "_id username fullName avatar",
        });

        return res
            .status(200)
            .json(
                ApiResponse.success(updatedVideo, SuccessMessages.VIDEO_UPDATED)
            );
    });

    static delete = asyncHandler(async (req, res) => {
        const { videoId } = req.params;

        VideoController.#validateObjectId(videoId, "video ID");

        const video = await VideoController.#findVideoOrFail(videoId);
        VideoController.#verifyOwnership(video, req.user._id);

        const videoPublicId = cloudinaryService.extractPublicId(
            video.videoFile
        );
        const thumbnailPublicId = cloudinaryService.extractPublicId(
            video.thumbnail
        );

        await Video.findByIdAndDelete(videoId);

        await Promise.all([
            Like.deleteMany({ video: videoId }),
            Comment.deleteMany({ video: videoId }),
        ]);

        Promise.all([
            videoPublicId && deleteFromCloudinary(videoPublicId, "video"),
            thumbnailPublicId && deleteFromCloudinary(thumbnailPublicId),
        ]).catch((err) =>
            console.warn("Failed to cleanup video files:", err.message)
        );

        return res
            .status(200)
            .json(ApiResponse.success({}, SuccessMessages.VIDEO_DELETED));
    });

    static togglePublish = asyncHandler(async (req, res) => {
        const { videoId } = req.params;

        VideoController.#validateObjectId(videoId, "video ID");

        const video = await VideoController.#findVideoOrFail(videoId);
        VideoController.#verifyOwnership(video, req.user._id);

        video.isPublished = !video.isPublished;
        await video.save();

        const message = video.isPublished
            ? "Video published successfully"
            : "Video unpublished successfully";

        return res.status(200).json(ApiResponse.success(video, message));
    });
}

export const getAllVideos = VideoController.getAll;
export const publishAVideo = VideoController.publish;
export const getVideoById = VideoController.getById;
export const updateVideo = VideoController.update;
export const deleteVideo = VideoController.delete;
export const togglePublishStatus = VideoController.togglePublish;

export { VideoController };
