import mongoose, { isValidObjectId } from "mongoose";

import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { BadRequestError, NotFoundError } from "../utils/ApiError.js";
import { ApiResponse, PaginationBuilder } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { PaginationDefaults } from "../constants.js";

class SubscriptionController {
    static #validateObjectId(id, fieldName = "ID") {
        if (!id || !isValidObjectId(id)) {
            throw new BadRequestError(`Invalid ${fieldName}`);
        }
    }

    static toggleSubscription = asyncHandler(async (req, res) => {
        const { channelId } = req.params;

        SubscriptionController.#validateObjectId(channelId, "channel ID");

        if (channelId === req.user._id.toString()) {
            throw new BadRequestError("You cannot subscribe to yourself");
        }

        const channel = await User.findById(channelId);
        if (!channel) {
            throw new NotFoundError("Channel", channelId);
        }

        const existingSubscription = await Subscription.findOne({
            channel: channelId,
            subscriber: req.user._id,
        });

        let isSubscribed;
        if (existingSubscription) {
            await Subscription.findByIdAndDelete(existingSubscription._id);
            isSubscribed = false;
        } else {
            await Subscription.create({
                channel: channelId,
                subscriber: req.user._id,
            });
            isSubscribed = true;
        }

        const subscribersCount = await Subscription.countDocuments({
            channel: channelId,
        });

        const message = isSubscribed
            ? "Subscribed successfully"
            : "Unsubscribed successfully";
        const statusCode = isSubscribed ? 201 : 200;

        return res.status(statusCode).json(
            ApiResponse.success(
                {
                    isSubscribed,
                    subscribersCount,
                },
                message
            )
        );
    });

    static getChannelSubscribers = asyncHandler(async (req, res) => {
        const { channelId } = req.params;
        const {
            page = PaginationDefaults.PAGE,
            limit = PaginationDefaults.LIMIT,
        } = req.query;

        SubscriptionController.#validateObjectId(channelId, "channel ID");

        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(
            Math.max(1, parseInt(limit, 10)),
            PaginationDefaults.MAX_LIMIT
        );

        const pipeline = [
            { $match: { channel: new mongoose.Types.ObjectId(channelId) } },
            {
                $lookup: {
                    from: "users",
                    localField: "subscriber",
                    foreignField: "_id",
                    as: "subscriber",
                    pipeline: [
                        {
                            $lookup: {
                                from: "subscriptions",
                                localField: "_id",
                                foreignField: "channel",
                                as: "subscribers",
                            },
                        },
                        {
                            $addFields: {
                                subscribersCount: { $size: "$subscribers" },
                                isSubscribed: req.user
                                    ? {
                                          $in: [
                                              new mongoose.Types.ObjectId(
                                                  req.user._id
                                              ),
                                              "$subscribers.subscriber",
                                          ],
                                      }
                                    : false,
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                username: 1,
                                fullName: 1,
                                avatar: 1,
                                subscribersCount: 1,
                                isSubscribed: 1,
                            },
                        },
                    ],
                },
            },
            { $unwind: "$subscriber" },
            { $sort: { createdAt: -1 } },
            {
                $project: {
                    _id: "$subscriber._id",
                    username: "$subscriber.username",
                    fullName: "$subscriber.fullName",
                    avatar: "$subscriber.avatar",
                    subscribersCount: "$subscriber.subscribersCount",
                    isSubscribed: "$subscriber.isSubscribed",
                    subscribedAt: "$createdAt",
                },
            },
        ];

        const totalDocs = await Subscription.countDocuments({
            channel: new mongoose.Types.ObjectId(channelId),
        });

        pipeline.push(
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum }
        );

        const subscribers = await Subscription.aggregate(pipeline);

        const pagination = new PaginationBuilder()
            .setPage(pageNum)
            .setLimit(limitNum)
            .setTotalDocs(totalDocs)
            .build();

        return res
            .status(200)
            .json(
                ApiResponse.paginated(
                    subscribers,
                    pagination,
                    "Channel subscribers fetched successfully"
                )
            );
    });

    static getSubscribedChannels = asyncHandler(async (req, res) => {
        const { subscriberId } = req.params;
        const {
            page = PaginationDefaults.PAGE,
            limit = PaginationDefaults.LIMIT,
        } = req.query;

        SubscriptionController.#validateObjectId(subscriberId, "subscriber ID");

        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(
            Math.max(1, parseInt(limit, 10)),
            PaginationDefaults.MAX_LIMIT
        );

        const pipeline = [
            {
                $match: {
                    subscriber: new mongoose.Types.ObjectId(subscriberId),
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "channel",
                    foreignField: "_id",
                    as: "channel",
                    pipeline: [
                        {
                            $lookup: {
                                from: "subscriptions",
                                localField: "_id",
                                foreignField: "channel",
                                as: "subscribers",
                            },
                        },
                        {
                            $lookup: {
                                from: "videos",
                                localField: "_id",
                                foreignField: "owner",
                                as: "videos",
                                pipeline: [
                                    { $match: { isPublished: true } },
                                    { $sort: { createdAt: -1 } },
                                    { $limit: 1 },
                                ],
                            },
                        },
                        {
                            $addFields: {
                                subscribersCount: { $size: "$subscribers" },
                                latestVideo: { $first: "$videos" },
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                username: 1,
                                fullName: 1,
                                avatar: 1,
                                subscribersCount: 1,
                                latestVideo: {
                                    _id: 1,
                                    title: 1,
                                    thumbnail: 1,
                                    createdAt: 1,
                                },
                            },
                        },
                    ],
                },
            },
            { $unwind: "$channel" },
            { $sort: { createdAt: -1 } },
            {
                $project: {
                    _id: "$channel._id",
                    username: "$channel.username",
                    fullName: "$channel.fullName",
                    avatar: "$channel.avatar",
                    subscribersCount: "$channel.subscribersCount",
                    latestVideo: "$channel.latestVideo",
                    subscribedAt: "$createdAt",
                },
            },
        ];

        const totalDocs = await Subscription.countDocuments({
            subscriber: new mongoose.Types.ObjectId(subscriberId),
        });

        pipeline.push(
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum }
        );

        const channels = await Subscription.aggregate(pipeline);

        const pagination = new PaginationBuilder()
            .setPage(pageNum)
            .setLimit(limitNum)
            .setTotalDocs(totalDocs)
            .build();

        return res
            .status(200)
            .json(
                ApiResponse.paginated(
                    channels,
                    pagination,
                    "Subscribed channels fetched successfully"
                )
            );
    });
}

export const toggleSubscription = SubscriptionController.toggleSubscription;
export const getUserChannelSubscribers =
    SubscriptionController.getChannelSubscribers;
export const getSubscribedChannels =
    SubscriptionController.getSubscribedChannels;

export { SubscriptionController };
