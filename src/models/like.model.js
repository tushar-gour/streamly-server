import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
    {
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video",
            index: true,
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            index: true,
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet",
            index: true,
        },
        likedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User reference is required"],
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

likeSchema.index({ video: 1, likedBy: 1 }, { unique: true, sparse: true });
likeSchema.index({ comment: 1, likedBy: 1 }, { unique: true, sparse: true });
likeSchema.index({ tweet: 1, likedBy: 1 }, { unique: true, sparse: true });

likeSchema.pre("save", function (next) {
    const targets = [this.video, this.comment, this.tweet].filter(Boolean);

    if (targets.length !== 1) {
        const error = new Error(
            "Like must be associated with exactly one target (video, comment, or tweet)"
        );
        return next(error);
    }

    next();
});

likeSchema.statics.toggleVideoLike = async function (videoId, userId) {
    const existingLike = await this.findOne({
        video: videoId,
        likedBy: userId,
    });

    if (existingLike) {
        await this.deleteOne({ _id: existingLike._id });
        return { liked: false, message: "Video unliked" };
    }

    await this.create({ video: videoId, likedBy: userId });
    return { liked: true, message: "Video liked" };
};

likeSchema.statics.toggleCommentLike = async function (commentId, userId) {
    const existingLike = await this.findOne({
        comment: commentId,
        likedBy: userId,
    });

    if (existingLike) {
        await this.deleteOne({ _id: existingLike._id });
        return { liked: false, message: "Comment unliked" };
    }

    await this.create({ comment: commentId, likedBy: userId });
    return { liked: true, message: "Comment liked" };
};

likeSchema.statics.toggleTweetLike = async function (tweetId, userId) {
    const existingLike = await this.findOne({
        tweet: tweetId,
        likedBy: userId,
    });

    if (existingLike) {
        await this.deleteOne({ _id: existingLike._id });
        return { liked: false, message: "Tweet unliked" };
    }

    await this.create({ tweet: tweetId, likedBy: userId });
    return { liked: true, message: "Tweet liked" };
};

likeSchema.statics.getVideoLikeCount = async function (videoId) {
    return this.countDocuments({ video: videoId });
};

likeSchema.statics.getCommentLikeCount = async function (commentId) {
    return this.countDocuments({ comment: commentId });
};

likeSchema.statics.hasUserLikedVideo = async function (videoId, userId) {
    const like = await this.findOne({ video: videoId, likedBy: userId });
    return !!like;
};

likeSchema.statics.getLikedVideosByUser = async function (
    userId,
    options = {}
) {
    const { page = 1, limit = 10 } = options;

    const likes = await this.find({ likedBy: userId, video: { $exists: true } })
        .populate({
            path: "video",
            populate: { path: "owner", select: "username fullName avatar" },
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await this.countDocuments({
        likedBy: userId,
        video: { $exists: true },
    });

    return {
        videos: likes.map((like) => like.video).filter(Boolean),
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalCount: total,
        },
    };
};

export const Like = mongoose.model("Like", likeSchema);
