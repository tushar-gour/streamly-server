import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { asyncHandler } from "../utils/asyncHandler.js";
import {
    ApiError,
    BadRequestError,
    NotFoundError,
    ConflictError,
    UnauthorizedError,
} from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
    cloudinaryService,
} from "../utils/cloudinary.js";
import { CookieOptions, SuccessMessages, ErrorMessages } from "../constants.js";

class UserController {
    static async #generateTokens(userId) {
        try {
            const user = await User.findById(userId).select("+refreshToken");

            if (!user) {
                throw new NotFoundError("User", userId);
            }

            const accessToken = user.generateAccessToken();
            const refreshToken = user.generateRefreshToken();

            user.refreshToken = refreshToken;
            await user.save({ validateBeforeSave: false });

            return { accessToken, refreshToken };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Failed to generate authentication tokens");
        }
    }

    static #getCookieOptions() {
        return {
            ...CookieOptions,
            secure: process.env.NODE_ENV === "production",
        };
    }

    static #validateRequired(fields, required) {
        const missing = required.filter(
            (field) => !fields[field] || fields[field].toString().trim() === ""
        );

        if (missing.length > 0) {
            throw new BadRequestError(
                `Missing required fields: ${missing.join(", ")}`
            );
        }
    }

    static register = asyncHandler(async (req, res) => {
        const { username, email, fullName, password } = req.body;

        UserController.#validateRequired(
            { username, email, fullName, password },
            ["username", "email", "fullName", "password"]
        );

        const existingUser = await User.findOne({
            $or: [
                { username: username.toLowerCase() },
                { email: email.toLowerCase() },
            ],
        });

        if (existingUser) {
            throw new ConflictError(ErrorMessages.USER_EXISTS);
        }

        const avatarLocalPath = req.files?.avatar?.[0]?.path;
        if (!avatarLocalPath) {
            throw new BadRequestError("Avatar image is required");
        }

        let coverImageLocalPath;
        if (req.files?.coverImage?.length > 0) {
            coverImageLocalPath = req.files.coverImage[0].path;
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath);
        if (!avatar) {
            throw new ApiError(500, "Failed to upload avatar image");
        }

        let coverImage = null;
        if (coverImageLocalPath) {
            coverImage = await uploadOnCloudinary(coverImageLocalPath);
        }

        const user = await User.create({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            fullName,
            password,
            avatar: avatar.secureUrl || avatar.url,
            coverImage: coverImage?.secureUrl || coverImage?.url || "",
        });

        const createdUser = await User.findById(user._id);

        if (!createdUser) {
            throw new ApiError(500, "Failed to create user");
        }

        return res
            .status(201)
            .json(
                ApiResponse.created(
                    createdUser,
                    SuccessMessages.REGISTER_SUCCESS
                )
            );
    });

    static login = asyncHandler(async (req, res) => {
        const { email, username, password } = req.body;

        if (!email && !username) {
            throw new BadRequestError("Email or username is required");
        }

        if (!password) {
            throw new BadRequestError("Password is required");
        }

        const user = await User.findByCredentials(email || username);

        if (!user) {
            throw new UnauthorizedError("Invalid credentials");
        }

        const isPasswordValid = await user.isPasswordCorrect(password);

        if (!isPasswordValid) {
            throw new UnauthorizedError("Invalid credentials");
        }

        const { accessToken, refreshToken } =
            await UserController.#generateTokens(user._id);

        const loggedInUser = await User.findById(user._id);

        const cookieOptions = UserController.#getCookieOptions();

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, {
                ...cookieOptions,
                maxAge: 10 * 24 * 60 * 60 * 1000,
            })
            .json(
                ApiResponse.success(
                    {
                        user: loggedInUser,
                        accessToken,
                        refreshToken,
                    },
                    SuccessMessages.LOGIN_SUCCESS
                )
            );
    });

    static logout = asyncHandler(async (req, res) => {
        await User.findByIdAndUpdate(
            req.user._id,
            { $unset: { refreshToken: 1 } },
            { new: true }
        );

        const cookieOptions = UserController.#getCookieOptions();

        return res
            .status(200)
            .clearCookie("accessToken", cookieOptions)
            .clearCookie("refreshToken", cookieOptions)
            .json(ApiResponse.success({}, SuccessMessages.LOGOUT_SUCCESS));
    });

    static refreshAccessToken = asyncHandler(async (req, res) => {
        const incomingRefreshToken =
            req.cookies?.refreshToken ||
            req.body?.refreshToken ||
            req.header("X-Refresh-Token");

        if (!incomingRefreshToken) {
            throw new UnauthorizedError("Refresh token is required");
        }

        try {
            const decodedToken = jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
            );

            const user = await User.findById(decodedToken._id).select(
                "+refreshToken"
            );

            if (!user) {
                throw new UnauthorizedError("Invalid refresh token");
            }

            if (incomingRefreshToken !== user.refreshToken) {
                throw new UnauthorizedError("Refresh token has been revoked");
            }

            const { accessToken, refreshToken } =
                await UserController.#generateTokens(user._id);

            const cookieOptions = UserController.#getCookieOptions();

            return res
                .status(200)
                .cookie("accessToken", accessToken, cookieOptions)
                .cookie("refreshToken", refreshToken, {
                    ...cookieOptions,
                    maxAge: 10 * 24 * 60 * 60 * 1000,
                })
                .json(
                    ApiResponse.success(
                        { accessToken, refreshToken },
                        SuccessMessages.TOKEN_REFRESHED
                    )
                );
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new UnauthorizedError("Invalid or expired refresh token");
        }
    });

    static getCurrentUser = asyncHandler(async (req, res) => {
        return res
            .status(200)
            .json(ApiResponse.success(req.user, SuccessMessages.USER_FETCHED));
    });

    static changePassword = asyncHandler(async (req, res) => {
        const { oldPassword, newPassword } = req.body;

        UserController.#validateRequired({ oldPassword, newPassword }, [
            "oldPassword",
            "newPassword",
        ]);

        const user = await User.findById(req.user._id).select("+password");

        if (!user) {
            throw new NotFoundError("User");
        }

        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

        if (!isPasswordCorrect) {
            throw new BadRequestError("Current password is incorrect");
        }

        user.password = newPassword;
        await user.save();

        return res
            .status(200)
            .json(ApiResponse.success({}, SuccessMessages.PASSWORD_CHANGED));
    });

    static updateAccountDetails = asyncHandler(async (req, res) => {
        const { fullName, email } = req.body;

        if (!fullName && !email) {
            throw new BadRequestError(
                "At least one field is required to update"
            );
        }

        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (email) updateData.email = email.toLowerCase();

        if (email) {
            const existingUser = await User.findOne({
                email: email.toLowerCase(),
                _id: { $ne: req.user._id },
            });

            if (existingUser) {
                throw new ConflictError("Email is already in use");
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        return res
            .status(200)
            .json(ApiResponse.success(user, SuccessMessages.USER_UPDATED));
    });

    static updateAvatar = asyncHandler(async (req, res) => {
        const avatarLocalPath = req.file?.path;

        if (!avatarLocalPath) {
            throw new BadRequestError("Avatar image is required");
        }

        const currentUser = await User.findById(req.user._id);
        const oldAvatarPublicId = cloudinaryService.extractPublicId(
            currentUser.avatar
        );

        const avatar = await uploadOnCloudinary(avatarLocalPath);

        if (!avatar) {
            throw new ApiError(500, "Failed to upload avatar");
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { avatar: avatar.secureUrl || avatar.url } },
            { new: true }
        );

        if (oldAvatarPublicId) {
            deleteFromCloudinary(oldAvatarPublicId).catch((err) =>
                console.warn("Failed to delete old avatar:", err.message)
            );
        }

        return res
            .status(200)
            .json(ApiResponse.success(user, SuccessMessages.AVATAR_UPDATED));
    });

    static updateCoverImage = asyncHandler(async (req, res) => {
        const coverImageLocalPath = req.file?.path;

        if (!coverImageLocalPath) {
            throw new BadRequestError("Cover image is required");
        }

        const currentUser = await User.findById(req.user._id);
        const oldCoverPublicId = cloudinaryService.extractPublicId(
            currentUser.coverImage
        );

        const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        if (!coverImage) {
            throw new ApiError(500, "Failed to upload cover image");
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { coverImage: coverImage.secureUrl || coverImage.url } },
            { new: true }
        );

        if (oldCoverPublicId) {
            deleteFromCloudinary(oldCoverPublicId).catch((err) =>
                console.warn("Failed to delete old cover image:", err.message)
            );
        }

        return res
            .status(200)
            .json(
                ApiResponse.success(user, SuccessMessages.COVER_IMAGE_UPDATED)
            );
    });

    static getChannelProfile = asyncHandler(async (req, res) => {
        const { username } = req.params;

        if (!username?.trim()) {
            throw new BadRequestError("Username is required");
        }

        const channel = await User.aggregate([
            {
                $match: { username: username.toLowerCase() },
            },
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
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo",
                },
            },
            {
                $addFields: {
                    subscribersCount: { $size: "$subscribers" },
                    subscribedToCount: { $size: "$subscribedTo" },
                    isSubscribed: {
                        $cond: {
                            if: {
                                $and: [
                                    { $ne: [req.user, null] },
                                    {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber",
                                        ],
                                    },
                                ],
                            },
                            then: true,
                            else: false,
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    email: 1,
                    avatar: 1,
                    coverImage: 1,
                    subscribersCount: 1,
                    subscribedToCount: 1,
                    isSubscribed: 1,
                    createdAt: 1,
                },
            },
        ]);

        if (!channel?.length) {
            throw new NotFoundError("Channel", username);
        }

        return res
            .status(200)
            .json(
                ApiResponse.success(
                    channel[0],
                    "Channel profile fetched successfully"
                )
            );
    });

    static getWatchHistory = asyncHandler(async (req, res) => {
        const user = await User.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(req.user._id) },
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            _id: 1,
                                            username: 1,
                                            fullName: 1,
                                            avatar: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $addFields: {
                                owner: { $first: "$owner" },
                            },
                        },
                    ],
                },
            },
        ]);

        const watchHistory = user[0]?.watchHistory || [];

        return res
            .status(200)
            .json(
                ApiResponse.success(
                    watchHistory,
                    "Watch history fetched successfully"
                )
            );
    });
}

export const registerUser = UserController.register;
export const loginUser = UserController.login;
export const logoutUser = UserController.logout;
export const refreshAccessToken = UserController.refreshAccessToken;
export const changeCurrentPassword = UserController.changePassword;
export const getCurrentUser = UserController.getCurrentUser;
export const updateAccountDetails = UserController.updateAccountDetails;
export const updateUserAvatar = UserController.updateAvatar;
export const updateCoverImage = UserController.updateCoverImage;
export const getUserChannelProfile = UserController.getChannelProfile;
export const getWatchHistory = UserController.getWatchHistory;

export { UserController };
