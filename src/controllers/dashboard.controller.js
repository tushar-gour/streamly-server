import mongoose, { isValidObjectId } from "mongoose";

import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { User } from "../models/user.model.js";
import { BadRequestError, NotFoundError } from "../utils/ApiError.js";
import { ApiResponse, PaginationBuilder } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { PaginationDefaults } from "../constants.js";

class DashboardController {
    static #validateObjectId(id, fieldName = "ID") {
        if (!id || !isValidObjectId(id)) {
            throw new BadRequestError(`Invalid ${fieldName}`);
        }
    }

    static getChannelStats = asyncHandler(async (req, res) => {
        const channelId = req.user._id;

        const [
            totalSubscribers,
            totalVideos,
            viewsResult,
            totalLikes,
            totalComments,
            recentSubscribers,
        ] = await Promise.all([
            Subscription.countDocuments({ channel: channelId }),

            Video.countDocuments({ owner: channelId }),

            Video.aggregate([
                { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
                {
                    $group: {
                        _id: null,
                        totalViews: { $sum: "$views" },
                    },
                },
            ]),

            Like.countDocuments({
                video: {
                    $in: await Video.find({ owner: channelId }).distinct("_id"),
                },
            }),

            Comment.countDocuments({
                video: {
                    $in: await Video.find({ owner: channelId }).distinct("_id"),
                },
            }),

            Subscription.countDocuments({
                channel: channelId,
                createdAt: {
                    $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
            }),
        ]);

        const totalViews = viewsResult[0]?.totalViews || 0;
        const averageViewsPerVideo =
            totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0;
        const engagementRate =
            totalViews > 0
                ? (((totalLikes + totalComments) / totalViews) * 100).toFixed(2)
                : "0.00";

        const stats = {
            overview: {
                totalSubscribers,
                totalVideos,
                totalViews,
                totalLikes,
                totalComments,
            },
            metrics: {
                averageViewsPerVideo,
                engagementRate: `${engagementRate}%`,
                recentSubscribers,
            },
            generatedAt: new Date().toISOString(),
        };

        return res
            .status(200)
            .json(
                ApiResponse.success(
                    stats,
                    "Channel statistics fetched successfully"
                )
            );
    });

    static getChannelVideos = asyncHandler(async (req, res) => {
        const channelId = req.user._id;
        const {
            page = PaginationDefaults.PAGE,
            limit = PaginationDefaults.LIMIT,
            sortBy = "createdAt",
            sortType = "desc",
            isPublished,
        } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(
            Math.max(1, parseInt(limit, 10)),
            PaginationDefaults.MAX_LIMIT
        );

        const matchStage = { owner: new mongoose.Types.ObjectId(channelId) };
        if (isPublished !== undefined) {
            matchStage.isPublished = isPublished === "true";
        }

        const pipeline = [
            { $match: matchStage },
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
                    _id: 1,
                    title: 1,
                    description: 1,
                    thumbnail: 1,
                    videoFile: 1,
                    duration: 1,
                    views: 1,
                    isPublished: 1,
                    likesCount: 1,
                    commentsCount: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
            { $sort: { [sortBy]: sortType === "asc" ? 1 : -1 } },
        ];

        const totalDocs = await Video.countDocuments(matchStage);

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
                    "Channel videos fetched successfully"
                )
            );
    });
}

export const getChannelStats = DashboardController.getChannelStats;
export const getChannelVideos = DashboardController.getChannelVideos;

export { DashboardController };
