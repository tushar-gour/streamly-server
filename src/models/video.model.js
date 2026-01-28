import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            type: String,
            required: [true, "Video file URL is required"],
        },
        thumbnail: {
            type: String,
            required: [true, "Thumbnail is required"],
        },
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            maxlength: [200, "Title cannot exceed 200 characters"],
            index: "text",
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true,
            maxlength: [5000, "Description cannot exceed 5000 characters"],
        },
        duration: {
            type: Number,
            required: [true, "Duration is required"],
            min: [0, "Duration must be positive"],
        },
        views: {
            type: Number,
            default: 0,
            min: [0, "Views cannot be negative"],
        },
        isPublished: {
            type: Boolean,
            default: true,
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
        toObject: {
            virtuals: true,
        },
    }
);

videoSchema.index({ owner: 1, createdAt: -1 });
videoSchema.index({ isPublished: 1, createdAt: -1 });
videoSchema.index({ title: "text", description: "text" });
videoSchema.index({ views: -1 });

videoSchema.virtual("formattedDuration").get(function () {
    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    const seconds = Math.floor(this.duration % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

videoSchema.virtual("formattedViews").get(function () {
    if (this.views >= 1000000) {
        return `${(this.views / 1000000).toFixed(1)}M`;
    }
    if (this.views >= 1000) {
        return `${(this.views / 1000).toFixed(1)}K`;
    }
    return this.views.toString();
});

videoSchema.methods.incrementViews = async function () {
    this.views += 1;
    return this.save({ validateBeforeSave: false });
};

videoSchema.methods.togglePublishStatus = async function () {
    this.isPublished = !this.isPublished;
    return this.save({ validateBeforeSave: false });
};

videoSchema.methods.isOwner = function (userId) {
    return this.owner.toString() === userId.toString();
};

videoSchema.statics.findPublished = async function (options = {}) {
    const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        search = "",
    } = options;

    const query = { isPublished: true };

    if (search) {
        query.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
        ];
    }

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const videos = await this.find(query)
        .populate("owner", "username fullName avatar")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await this.countDocuments(query);

    return {
        videos,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalCount: total,
            hasNextPage: page < Math.ceil(total / limit),
            hasPreviousPage: page > 1,
        },
    };
};

videoSchema.statics.findByOwner = async function (
    ownerId,
    includeUnpublished = false
) {
    const query = { owner: ownerId };

    if (!includeUnpublished) {
        query.isPublished = true;
    }

    return this.find(query).sort({ createdAt: -1 });
};

videoSchema.statics.getTrending = async function (limit = 10) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return this.find({
        isPublished: true,
        createdAt: { $gte: weekAgo },
    })
        .populate("owner", "username fullName avatar")
        .sort({ views: -1 })
        .limit(limit);
};

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
