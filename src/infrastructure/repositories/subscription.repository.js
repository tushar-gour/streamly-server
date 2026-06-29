import { SubscriptionRepository } from "../../domain/repositories/subscription.repository.js";
import { createId } from "../../shared/helpers/id-generator.js";
import { prisma } from "../database/prisma/client.js";

const ownerSelect = {
    id: true,
    username: true,
    fullName: true,
    avatar: true,
};

class PrismaSubscriptionRepository extends SubscriptionRepository {
    findBySubscriberAndChannel(subscriberId, channelId) {
        return prisma.subscription
            .findUnique({
                where: {
                    subscriberId_channelId: {
                        subscriberId,
                        channelId,
                    },
                },
            })
            .then((subscription) =>
                subscription
                    ? { ...subscription, _id: subscription.id }
                    : subscription
            );
    }

    create(subscriptionData) {
        return prisma.subscription.create({
            data: {
                id: createId(),
                channelId: subscriptionData.channel,
                subscriberId: subscriptionData.subscriber,
            },
        });
    }

    deleteById(subscriptionId) {
        return prisma.subscription.delete({ where: { id: subscriptionId } });
    }

    countByChannel(channelId) {
        return prisma.subscription.count({ where: { channelId } });
    }

    countBySubscriber(subscriberId) {
        return prisma.subscription.count({ where: { subscriberId } });
    }

    countRecentByChannel(channelId, since) {
        return prisma.subscription.count({
            where: {
                channelId,
                createdAt: { gte: since },
            },
        });
    }

    async getChannelSubscribers({
        channelId,
        currentUserId,
        pageNum,
        limitNum,
    }) {
        const where = { channelId };
        const [subscriptions, totalDocs] = await Promise.all([
            prisma.subscription.findMany({
                where,
                include: {
                    subscriber: {
                        select: {
                            ...ownerSelect,
                            subscribers: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            prisma.subscription.count({ where }),
        ]);

        return {
            subscribers: subscriptions.map((subscription) => ({
                _id: subscription.subscriber.id,
                username: subscription.subscriber.username,
                fullName: subscription.subscriber.fullName,
                avatar: subscription.subscriber.avatar,
                subscribersCount: subscription.subscriber.subscribers.length,
                isSubscribed: currentUserId
                    ? subscription.subscriber.subscribers.some(
                          (subscriber) =>
                              subscriber.subscriberId === currentUserId
                      )
                    : false,
                subscribedAt: subscription.createdAt,
            })),
            totalDocs,
        };
    }

    async getSubscribedChannels({ subscriberId, pageNum, limitNum }) {
        const where = { subscriberId };
        const [subscriptions, totalDocs] = await Promise.all([
            prisma.subscription.findMany({
                where,
                include: {
                    channel: {
                        select: {
                            ...ownerSelect,
                            subscribers: true,
                            videos: {
                                where: { isPublished: true },
                                orderBy: { createdAt: "desc" },
                                take: 1,
                            },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            prisma.subscription.count({ where }),
        ]);

        return {
            channels: subscriptions.map((subscription) => {
                const latestVideo = subscription.channel.videos[0];
                return {
                    _id: subscription.channel.id,
                    username: subscription.channel.username,
                    fullName: subscription.channel.fullName,
                    avatar: subscription.channel.avatar,
                    subscribersCount: subscription.channel.subscribers.length,
                    latestVideo: latestVideo
                        ? {
                              _id: latestVideo.id,
                              title: latestVideo.title,
                              thumbnail: latestVideo.thumbnail,
                              createdAt: latestVideo.createdAt,
                          }
                        : null,
                    subscribedAt: subscription.createdAt,
                };
            }),
            totalDocs,
        };
    }
}

export { PrismaSubscriptionRepository };
