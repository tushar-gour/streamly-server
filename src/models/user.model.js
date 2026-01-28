import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { JwtConfig } from "../constants.js";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: [true, "Username is required"],
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
            minlength: [3, "Username must be at least 3 characters"],
            maxlength: [30, "Username cannot exceed 30 characters"],
            match: [
                /^[a-zA-Z0-9_]+$/,
                "Username can only contain letters, numbers, and underscores",
            ],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
        },
        fullName: {
            type: String,
            required: [true, "Full name is required"],
            trim: true,
            index: true,
            minlength: [2, "Full name must be at least 2 characters"],
            maxlength: [100, "Full name cannot exceed 100 characters"],
        },
        avatar: {
            type: String,
            required: [true, "Avatar is required"],
        },
        coverImage: {
            type: String,
            default: "",
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video",
            },
        ],
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters"],
            select: false,
        },
        refreshToken: {
            type: String,
            select: false,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret) {
                delete ret.password;
                delete ret.refreshToken;
                delete ret.__v;
                return ret;
            },
        },
        toObject: {
            virtuals: true,
        },
    }
);

userSchema.index({ email: 1, username: 1 });
userSchema.index({ createdAt: -1 });

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }

    try {
        const saltRounds = process.env.NODE_ENV === "production" ? 12 : 10;
        this.password = await bcrypt.hash(this.password, saltRounds);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.pre("save", function (next) {
    if (this.isNew) {
        this.createdAt = new Date();
    }
    this.updatedAt = new Date();
    next();
});

userSchema.methods.isPasswordCorrect = async function (candidatePassword) {
    if (!this.password) {
        return false;
    }
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAccessToken = function () {
    const payload = {
        _id: this._id.toString(),
        email: this.email,
        username: this.username,
        fullName: this.fullName,
    };

    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: JwtConfig.ACCESS_TOKEN_EXPIRY,
    });
};

userSchema.methods.generateRefreshToken = function () {
    const payload = {
        _id: this._id.toString(),
    };

    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: JwtConfig.REFRESH_TOKEN_EXPIRY,
    });
};

userSchema.methods.generateTokens = function () {
    return {
        accessToken: this.generateAccessToken(),
        refreshToken: this.generateRefreshToken(),
    };
};

userSchema.methods.addToWatchHistory = async function (videoId) {
    this.watchHistory = this.watchHistory.filter(
        (id) => id.toString() !== videoId.toString()
    );

    this.watchHistory.unshift(videoId);

    if (this.watchHistory.length > 100) {
        this.watchHistory = this.watchHistory.slice(0, 100);
    }

    return this.save({ validateBeforeSave: false });
};

userSchema.methods.getPublicProfile = function () {
    return {
        _id: this._id,
        username: this.username,
        fullName: this.fullName,
        avatar: this.avatar,
        coverImage: this.coverImage,
        createdAt: this.createdAt,
    };
};

userSchema.statics.findByCredentials = async function (identifier) {
    return this.findOne({
        $or: [
            { email: identifier.toLowerCase() },
            { username: identifier.toLowerCase() },
        ],
    }).select("+password +refreshToken");
};

userSchema.statics.findByIdWithPassword = async function (id) {
    return this.findById(id).select("+password");
};

userSchema.statics.findByIdWithRefreshToken = async function (id) {
    return this.findById(id).select("+refreshToken");
};

userSchema.statics.isUsernameAvailable = async function (username) {
    const user = await this.findOne({ username: username.toLowerCase() });
    return !user;
};

userSchema.statics.isEmailAvailable = async function (email) {
    const user = await this.findOne({ email: email.toLowerCase() });
    return !user;
};

userSchema.virtual("profileUrl").get(function () {
    return `/users/${this.username}`;
});

export const User = mongoose.model("User", userSchema);
