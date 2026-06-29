import {
    BadRequestError,
    NotFoundError,
} from "../../shared/errors/api-error.js";
import { PaginationDefaults } from "../../shared/constants/index.js";
import { PaginationBuilder } from "../../shared/responses/api-response.js";
import { ObjectIdValidator } from "../../shared/validators/object-id.validator.js";

class SubscriptionService {
    constructor({ subscriptionRepository, userRepository }) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
    }

    async toggleSubscription({ channelId, userId }) {
        ObjectIdValidator.ensureValid(channelId, "channel ID");

        if (channelId === userId.toString()) {
            throw new BadRequestError("You cannot subscribe to yourself");
        }

        const channel = await this.userRepository.findById(channelId);
        if (!channel) {
            throw new NotFoundError("Channel", channelId);
        }

        const existingSubscription =
            await this.subscriptionRepository.findBySubscriberAndChannel(
                userId,
                channelId
            );

        let isSubscribed;
        if (existingSubscription) {
            await this.subscriptionRepository.deleteById(
                existingSubscription._id
            );
            isSubscribed = false;
        } else {
            await this.subscriptionRepository.create({
                channel: channelId,
                subscriber: userId,
            });
            isSubscribed = true;
        }

        const subscribersCount =
            await this.subscriptionRepository.countByChannel(channelId);

        return {
            statusCode: isSubscribed ? 201 : 200,
            data: { isSubscribed, subscribersCount },
            message: isSubscribed
                ? "Subscribed successfully"
                : "Unsubscribed successfully",
        };
    }

    async getChannelSubscribers({ channelId, currentUserId, query }) {
        ObjectIdValidator.ensureValid(channelId, "channel ID");

        const { pageNum, limitNum } = this.#getPagination(
            query.page ?? PaginationDefaults.PAGE,
            query.limit ?? PaginationDefaults.LIMIT
        );

        const { subscribers, totalDocs } =
            await this.subscriptionRepository.getChannelSubscribers({
                channelId,
                currentUserId,
                pageNum,
                limitNum,
            });

        return {
            data: subscribers,
            pagination: new PaginationBuilder()
                .setPage(pageNum)
                .setLimit(limitNum)
                .setTotalDocs(totalDocs)
                .build(),
            message: "Channel subscribers fetched successfully",
        };
    }

    async getSubscribedChannels({ subscriberId, query }) {
        ObjectIdValidator.ensureValid(subscriberId, "subscriber ID");

        const { pageNum, limitNum } = this.#getPagination(
            query.page ?? PaginationDefaults.PAGE,
            query.limit ?? PaginationDefaults.LIMIT
        );

        const { channels, totalDocs } =
            await this.subscriptionRepository.getSubscribedChannels({
                subscriberId,
                pageNum,
                limitNum,
            });

        return {
            data: channels,
            pagination: new PaginationBuilder()
                .setPage(pageNum)
                .setLimit(limitNum)
                .setTotalDocs(totalDocs)
                .build(),
            message: "Subscribed channels fetched successfully",
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
}

export { SubscriptionService };
