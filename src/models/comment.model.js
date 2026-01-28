import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
    {
        content: {
            type: String,
            required: [true, "Comment content is required"],
            trim: true,
            maxlength: [2000, "Comment cannot exceed 2000 characters"],
        },
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video",
            required: [true, "Video reference is required"],
            index: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Owner is required"],
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret) {
                delete ret.__v;
                return ret;
            },
        },
    }
);

commentSchema.index({ video: 1, createdAt: -1 });
commentSchema.index({ owner: 1, createdAt: -1 });

commentSchema.methods.isOwner = function (userId) {
    return this.owner.toString() === userId.toString();
};

commentSchema.statics.findByVideo = async function (videoId, options = {}) {
    const { page = 1, limit = 10 } = options;

    const comments = await this.find({ video: videoId })
        .populate("owner", "username fullName avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await this.countDocuments({ video: videoId });

    return {
        comments,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalCount: total,
            hasNextPage: page < Math.ceil(total / limit),
            hasPreviousPage: page > 1,
        },
    };
};

commentSchema.statics.countByVideo = async function (videoId) {
    return this.countDocuments({ video: videoId });
};

commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("Comment", commentSchema);
