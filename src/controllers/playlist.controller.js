import mongoose, { isValidObjectId } from "mongoose";

import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import {
    BadRequestError,
    NotFoundError,
    ForbiddenError,
} from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

class PlaylistController {
    static #validateObjectId(id, fieldName = "ID") {
        if (!id || !isValidObjectId(id)) {
            throw new BadRequestError(`Invalid ${fieldName}`);
        }
    }

    static async #findPlaylistOrFail(playlistId) {
        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            throw new NotFoundError("Playlist", playlistId);
        }
        return playlist;
    }

    static #verifyOwnership(playlist, userId) {
        if (playlist.owner.toString() !== userId.toString()) {
            throw new ForbiddenError(
                "You are not authorized to modify this playlist"
            );
        }
    }

    static #buildPlaylistPipeline(matchStage = {}) {
        return [
            { $match: matchStage },
            {
                $lookup: {
                    from: "videos",
                    localField: "videos",
                    foreignField: "_id",
                    as: "videos",
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
                    videosCount: { $size: "$videos" },
                    totalViews: { $sum: "$videos.views" },
                },
            },
        ];
    }

    static create = asyncHandler(async (req, res) => {
        const { name, description } = req.body;

        if (!name?.trim()) {
            throw new BadRequestError("Playlist name is required");
        }

        const playlist = await Playlist.create({
            name: name.trim(),
            description: description?.trim() || "",
            owner: req.user._id,
            videos: [],
        });

        const createdPlaylist = await Playlist.findById(playlist._id).populate({
            path: "owner",
            select: "_id username fullName avatar",
        });

        return res
            .status(201)
            .json(
                ApiResponse.created(
                    createdPlaylist,
                    "Playlist created successfully"
                )
            );
    });

    static getById = asyncHandler(async (req, res) => {
        const { playlistId } = req.params;

        PlaylistController.#validateObjectId(playlistId, "playlist ID");

        const pipeline = PlaylistController.#buildPlaylistPipeline({
            _id: new mongoose.Types.ObjectId(playlistId),
        });

        const playlists = await Playlist.aggregate(pipeline);

        if (!playlists?.length) {
            throw new NotFoundError("Playlist", playlistId);
        }

        return res
            .status(200)
            .json(
                ApiResponse.success(
                    playlists[0],
                    "Playlist fetched successfully"
                )
            );
    });

    static getUserPlaylists = asyncHandler(async (req, res) => {
        const { userId } = req.params;

        PlaylistController.#validateObjectId(userId, "user ID");

        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError("User", userId);
        }

        const pipeline = [
            { $match: { owner: new mongoose.Types.ObjectId(userId) } },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: "videos",
                    localField: "videos",
                    foreignField: "_id",
                    as: "videos",
                },
            },
            {
                $addFields: {
                    videosCount: { $size: "$videos" },
                    firstVideo: { $first: "$videos" },
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    videosCount: 1,
                    thumbnail: "$firstVideo.thumbnail",
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ];

        const playlists = await Playlist.aggregate(pipeline);

        return res
            .status(200)
            .json(
                ApiResponse.success(
                    playlists,
                    "User playlists fetched successfully"
                )
            );
    });

    static update = asyncHandler(async (req, res) => {
        const { playlistId } = req.params;
        const { name, description } = req.body;

        PlaylistController.#validateObjectId(playlistId, "playlist ID");

        const playlist =
            await PlaylistController.#findPlaylistOrFail(playlistId);
        PlaylistController.#verifyOwnership(playlist, req.user._id);

        const updateData = {};
        if (name?.trim()) updateData.name = name.trim();
        if (description !== undefined)
            updateData.description = description.trim();

        if (Object.keys(updateData).length === 0) {
            throw new BadRequestError(
                "At least one field is required to update"
            );
        }

        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate({
            path: "owner",
            select: "_id username fullName avatar",
        });

        return res
            .status(200)
            .json(
                ApiResponse.success(
                    updatedPlaylist,
                    "Playlist updated successfully"
                )
            );
    });

    static delete = asyncHandler(async (req, res) => {
        const { playlistId } = req.params;

        PlaylistController.#validateObjectId(playlistId, "playlist ID");

        const playlist =
            await PlaylistController.#findPlaylistOrFail(playlistId);
        PlaylistController.#verifyOwnership(playlist, req.user._id);

        await Playlist.findByIdAndDelete(playlistId);

        return res
            .status(200)
            .json(ApiResponse.success({}, "Playlist deleted successfully"));
    });

    static addVideo = asyncHandler(async (req, res) => {
        const { playlistId, videoId } = req.params;

        PlaylistController.#validateObjectId(playlistId, "playlist ID");
        PlaylistController.#validateObjectId(videoId, "video ID");

        const playlist =
            await PlaylistController.#findPlaylistOrFail(playlistId);
        PlaylistController.#verifyOwnership(playlist, req.user._id);

        const video = await Video.findById(videoId);
        if (!video) {
            throw new NotFoundError("Video", videoId);
        }

        if (playlist.videos.includes(videoId)) {
            throw new BadRequestError("Video is already in the playlist");
        }

        playlist.videos.push(videoId);
        await playlist.save();

        const updatedPlaylist = await Playlist.findById(playlistId)
            .populate({
                path: "owner",
                select: "_id username fullName avatar",
            })
            .populate({
                path: "videos",
                select: "_id title thumbnail duration",
            });

        return res
            .status(200)
            .json(
                ApiResponse.success(
                    updatedPlaylist,
                    "Video added to playlist successfully"
                )
            );
    });

    static removeVideo = asyncHandler(async (req, res) => {
        const { playlistId, videoId } = req.params;

        PlaylistController.#validateObjectId(playlistId, "playlist ID");
        PlaylistController.#validateObjectId(videoId, "video ID");

        const playlist =
            await PlaylistController.#findPlaylistOrFail(playlistId);
        PlaylistController.#verifyOwnership(playlist, req.user._id);

        const videoIndex = playlist.videos.findIndex(
            (v) => v.toString() === videoId
        );

        if (videoIndex === -1) {
            throw new BadRequestError("Video is not in the playlist");
        }

        playlist.videos.splice(videoIndex, 1);
        await playlist.save();

        const updatedPlaylist = await Playlist.findById(playlistId)
            .populate({
                path: "owner",
                select: "_id username fullName avatar",
            })
            .populate({
                path: "videos",
                select: "_id title thumbnail duration",
            });

        return res
            .status(200)
            .json(
                ApiResponse.success(
                    updatedPlaylist,
                    "Video removed from playlist successfully"
                )
            );
    });
}

export const createPlaylist = PlaylistController.create;
export const getPlaylistById = PlaylistController.getById;
export const getUserPlaylists = PlaylistController.getUserPlaylists;
export const updatePlaylist = PlaylistController.update;
export const deletePlaylist = PlaylistController.delete;
export const addVideoToPlaylist = PlaylistController.addVideo;
export const removeVideoFromPlaylist = PlaylistController.removeVideo;

export { PlaylistController };
