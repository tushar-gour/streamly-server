import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
    {
        subscriber: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Subscriber is required"],
            index: true,
        },
        channel: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Channel is required"],
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: function (doc, ret) {
                delete ret.__v;
                return ret;
            },
        },
    }
);

subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });
subscriptionSchema.index({ channel: 1, createdAt: -1 });
subscriptionSchema.index({ subscriber: 1, createdAt: -1 });

subscriptionSchema.pre("save", function (next) {
    if (this.subscriber.toString() === this.channel.toString()) {
        const error = new Error("Users cannot subscribe to themselves");
        return next(error);
    }
    next();
});

subscriptionSchema.statics.toggleSubscription = async function (
    subscriberId,
    channelId
) {
    if (subscriberId.toString() === channelId.toString()) {
        throw new Error("Users cannot subscribe to themselves");
    }

    const existingSubscription = await this.findOne({
        subscriber: subscriberId,
        channel: channelId,
    });

    if (existingSubscription) {
        await this.deleteOne({ _id: existingSubscription._id });
        return { subscribed: false, message: "Unsubscribed successfully" };
    }

    await this.create({ subscriber: subscriberId, channel: channelId });
    return { subscribed: true, message: "Subscribed successfully" };
};

subscriptionSchema.statics.isSubscribed = async function (
    subscriberId,
    channelId
) {
    const subscription = await this.findOne({
        subscriber: subscriberId,
        channel: channelId,
    });
    return !!subscription;
};

subscriptionSchema.statics.getSubscriberCount = async function (channelId) {
    return this.countDocuments({ channel: channelId });
};

subscriptionSchema.statics.getSubscriptionCount = async function (
    subscriberId
) {
    return this.countDocuments({ subscriber: subscriberId });
};

subscriptionSchema.statics.getChannelSubscribers = async function (
    channelId,
    options = {}
) {
    const { page = 1, limit = 10 } = options;

    const subscriptions = await this.find({ channel: channelId })
        .populate("subscriber", "username fullName avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await this.countDocuments({ channel: channelId });

    return {
        subscribers: subscriptions.map((sub) => sub.subscriber),
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalCount: total,
        },
    };
};

subscriptionSchema.statics.getSubscribedChannels = async function (
    subscriberId,
    options = {}
) {
    const { page = 1, limit = 10 } = options;

    const subscriptions = await this.find({ subscriber: subscriberId })
        .populate("channel", "username fullName avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await this.countDocuments({ subscriber: subscriberId });

    return {
        channels: subscriptions.map((sub) => sub.channel),
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalCount: total,
        },
    };
};

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
