import { container } from "../../core/container/index.js";
import { asyncHandler } from "../../shared/helpers/async-handler.js";
import { ApiResponse } from "../../shared/responses/api-response.js";

const playlistService = container.services.playlistService;

class PlaylistController {
    static create = asyncHandler(async (req, res) => {
        const result = await playlistService.create({
            body: req.body,
            userId: req.user._id,
        });
        return res
            .status(result.statusCode)
            .json(ApiResponse.created(result.data, result.message));
    });

    static getById = asyncHandler(async (req, res) => {
        const result = await playlistService.getById(req.params.playlistId);
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static getUserPlaylists = asyncHandler(async (req, res) => {
        const result = await playlistService.getUserPlaylists(
            req.params.userId
        );
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static update = asyncHandler(async (req, res) => {
        const result = await playlistService.update({
            playlistId: req.params.playlistId,
            body: req.body,
            userId: req.user._id,
        });
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static delete = asyncHandler(async (req, res) => {
        const result = await playlistService.delete({
            playlistId: req.params.playlistId,
            userId: req.user._id,
        });
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static addVideo = asyncHandler(async (req, res) => {
        const result = await playlistService.addVideo({
            playlistId: req.params.playlistId,
            videoId: req.params.videoId,
            userId: req.user._id,
        });
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static removeVideo = asyncHandler(async (req, res) => {
        const result = await playlistService.removeVideo({
            playlistId: req.params.playlistId,
            videoId: req.params.videoId,
            userId: req.user._id,
        });
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
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
