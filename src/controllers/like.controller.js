import mongoose, { isValidObjectId } from "mongoose";

import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { BadRequestError, NotFoundError } from "../utils/ApiError.js";
import { ApiResponse, PaginationBuilder } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { PaginationDefaults } from "../constants.js";

class LikeController {
    static #validateObjectId(id, fieldName = "ID") {
        if (!id || !isValidObjectId(id)) {
            throw new BadRequestError(`Invalid ${fieldName}`);
        }
    }

    static async #toggleLike({ field, documentId, userId }) {
        const existingLike = await Like.findOne({
            [field]: documentId,
            likedBy: userId,
        });

        if (existingLike) {
            await Like.findByIdAndDelete(existingLike._id);
            return { isLiked: false, like: null };
        }

        const newLike = await Like.create({
            [field]: documentId,
            likedBy: userId,
        });

        return { isLiked: true, like: newLike };
    }

    static toggleVideoLike = asyncHandler(async (req, res) => {
        const { videoId } = req.params;

        LikeController.#validateObjectId(videoId, "video ID");

        const video = await Video.findById(videoId);
        if (!video) {
            throw new NotFoundError("Video", videoId);
        }

        const { isLiked, like } = await LikeController.#toggleLike({
            field: "video",
            documentId: videoId,
            userId: req.user._id,
        });

        const message = isLiked
            ? "Video liked successfully"
            : "Video unliked successfully";
        const statusCode = isLiked ? 201 : 200;

        return res.status(statusCode).json(
            ApiResponse.success(
                {
                    isLiked,
                    likesCount: await Like.countDocuments({ video: videoId }),
                },
                message
            )
        );
    });

    static toggleCommentLike = asyncHandler(async (req, res) => {
        const { commentId } = req.params;

        LikeController.#validateObjectId(commentId, "comment ID");

        const comment = await Comment.findById(commentId);
        if (!comment) {
            throw new NotFoundError("Comment", commentId);
        }

        const { isLiked } = await LikeController.#toggleLike({
            field: "comment",
            documentId: commentId,
            userId: req.user._id,
        });

        const message = isLiked
            ? "Comment liked successfully"
            : "Comment unliked successfully";
        const statusCode = isLiked ? 201 : 200;

        return res.status(statusCode).json(
            ApiResponse.success(
                {
                    isLiked,
                    likesCount: await Like.countDocuments({
                        comment: commentId,
                    }),
                },
                message
            )
        );
    });

    static toggleTweetLike = asyncHandler(async (req, res) => {
        const { tweetId } = req.params;

        LikeController.#validateObjectId(tweetId, "tweet ID");

        const { isLiked } = await LikeController.#toggleLike({
            field: "tweet",
            documentId: tweetId,
            userId: req.user._id,
        });

        const message = isLiked
            ? "Tweet liked successfully"
            : "Tweet unliked successfully";
        const statusCode = isLiked ? 201 : 200;

        return res.status(statusCode).json(
            ApiResponse.success(
                {
                    isLiked,
                    likesCount: await Like.countDocuments({ tweet: tweetId }),
                },
                message
            )
        );
    });

    static getLikedVideos = asyncHandler(async (req, res) => {
        const {
            page = PaginationDefaults.PAGE,
            limit = PaginationDefaults.LIMIT,
        } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(
            Math.max(1, parseInt(limit, 10)),
            PaginationDefaults.MAX_LIMIT
        );

        const pipeline = [
            {
                $match: {
                    likedBy: new mongoose.Types.ObjectId(req.user._id),
                    video: { $exists: true, $ne: null },
                },
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "video",
                    foreignField: "_id",
                    as: "video",
                    pipeline: [
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
                        },
                    ],
                },
            },
            { $unwind: "$video" },
            { $match: { "video.isPublished": true } },
            { $sort: { createdAt: -1 } },
            {
                $project: {
                    _id: "$video._id",
                    title: "$video.title",
                    description: "$video.description",
                    thumbnail: "$video.thumbnail",
                    duration: "$video.duration",
                    views: "$video.views",
                    owner: "$video.owner",
                    createdAt: "$video.createdAt",
                    likedAt: "$createdAt",
                },
            },
        ];

        const countPipeline = [
            {
                $match: {
                    likedBy: new mongoose.Types.ObjectId(req.user._id),
                    video: { $exists: true, $ne: null },
                },
            },
            { $count: "total" },
        ];
        const countResult = await Like.aggregate(countPipeline);
        const totalDocs = countResult[0]?.total || 0;

        pipeline.push(
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum }
        );

        const likedVideos = await Like.aggregate(pipeline);

        const pagination = new PaginationBuilder()
            .setPage(pageNum)
            .setLimit(limitNum)
            .setTotalDocs(totalDocs)
            .build();

        return res
            .status(200)
            .json(
                ApiResponse.paginated(
                    likedVideos,
                    pagination,
                    "Liked videos fetched successfully"
                )
            );
    });
}

export const toggleVideoLike = LikeController.toggleVideoLike;
export const toggleCommentLike = LikeController.toggleCommentLike;
export const toggleTweetLike = LikeController.toggleTweetLike;
export const getLikedVideos = LikeController.getLikedVideos;

export { LikeController };
