import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Playlist name is required"],
            trim: true,
            maxlength: [100, "Playlist name cannot exceed 100 characters"],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, "Description cannot exceed 500 characters"],
            default: "",
        },
        videos: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video",
            },
        ],
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Owner is required"],
            index: true,
        },
        isPublic: {
            type: Boolean,
            default: true,
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

playlistSchema.index({ owner: 1, createdAt: -1 });
playlistSchema.index({ name: 1, owner: 1 });
playlistSchema.index({ isPublic: 1, createdAt: -1 });

playlistSchema.virtual("videoCount").get(function () {
    return this.videos?.length ?? 0;
});

playlistSchema.methods.isOwner = function (userId) {
    return this.owner.toString() === userId.toString();
};

playlistSchema.methods.addVideo = async function (videoId) {
    const videoExists = this.videos.some(
        (id) => id.toString() === videoId.toString()
    );

    if (!videoExists) {
        this.videos.push(videoId);
        await this.save();
    }

    return this;
};

playlistSchema.methods.removeVideo = async function (videoId) {
    this.videos = this.videos.filter(
        (id) => id.toString() !== videoId.toString()
    );
    await this.save();
    return this;
};

playlistSchema.methods.hasVideo = function (videoId) {
    return this.videos.some((id) => id.toString() === videoId.toString());
};

playlistSchema.methods.reorderVideos = async function (newOrder) {
    const currentIds = this.videos.map((id) => id.toString());
    const newIds = newOrder.map((id) => id.toString());

    if (currentIds.length !== newIds.length) {
        throw new Error("New order must contain all existing videos");
    }

    const allExist = newIds.every((id) => currentIds.includes(id));
    if (!allExist) {
        throw new Error("New order contains invalid video IDs");
    }

    this.videos = newOrder;
    await this.save();
    return this;
};

playlistSchema.statics.findByOwner = async function (ownerId, options = {}) {
    const { includePrivate = false } = options;

    const query = { owner: ownerId };
    if (!includePrivate) {
        query.isPublic = true;
    }

    return this.find(query)
        .populate("videos", "title thumbnail duration views")
        .sort({ createdAt: -1 });
};

playlistSchema.statics.findContainingVideo = async function (videoId) {
    return this.find({
        videos: videoId,
        isPublic: true,
    })
        .populate("owner", "username fullName avatar")
        .sort({ createdAt: -1 });
};

export const Playlist = mongoose.model("Playlist", playlistSchema);
