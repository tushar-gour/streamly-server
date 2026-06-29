// @ts-nocheck
import {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
} from "../../shared/errors/api-error.js";
import { ObjectIdValidator } from "../../shared/validators/object-id.validator.js";

class PlaylistService {
    constructor({ playlistRepository, videoRepository, userRepository }) {
        this.playlistRepository = playlistRepository;
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
    }

    async create({ body, userId }) {
        const { name, description } = body;

        if (!name?.trim()) {
            throw new BadRequestError("Playlist name is required");
        }

        const playlist = await this.playlistRepository.create({
            name: name.trim(),
            description: description?.trim() || "",
            owner: userId,
            videos: [],
        });

        const createdPlaylist = await this.playlistRepository.findByIdWithOwner(
            playlist._id
        );

        return {
            statusCode: 201,
            data: createdPlaylist,
            message: "Playlist created successfully",
        };
    }

    async getById(playlistId) {
        ObjectIdValidator.ensureValid(playlistId, "playlist ID");

        const playlists =
            await this.playlistRepository.getByIdWithDetails(playlistId);

        if (!playlists?.length) {
            throw new NotFoundError("Playlist", playlistId);
        }

        return { data: playlists[0], message: "Playlist fetched successfully" };
    }

    async getUserPlaylists(userId) {
        ObjectIdValidator.ensureValid(userId, "user ID");

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError("User", userId);
        }

        return {
            data: await this.playlistRepository.getUserPlaylists(userId),
            message: "User playlists fetched successfully",
        };
    }

    async update({ playlistId, body, userId }) {
        ObjectIdValidator.ensureValid(playlistId, "playlist ID");

        const playlist = await this.#findPlaylistOrFail(playlistId);
        this.#verifyOwnership(playlist, userId);

        const updateData = {};
        if (body.name?.trim()) updateData.name = body.name.trim();
        if (body.description !== undefined) {
            updateData.description = body.description.trim();
        }

        if (Object.keys(updateData).length === 0) {
            throw new BadRequestError(
                "At least one field is required to update"
            );
        }

        return {
            data: await this.playlistRepository.updateById(
                playlistId,
                updateData
            ),
            message: "Playlist updated successfully",
        };
    }

    async delete({ playlistId, userId }) {
        ObjectIdValidator.ensureValid(playlistId, "playlist ID");

        const playlist = await this.#findPlaylistOrFail(playlistId);
        this.#verifyOwnership(playlist, userId);

        await this.playlistRepository.deleteById(playlistId);

        return { data: {}, message: "Playlist deleted successfully" };
    }

    async addVideo({ playlistId, videoId, userId }) {
        ObjectIdValidator.ensureValid(playlistId, "playlist ID");
        ObjectIdValidator.ensureValid(videoId, "video ID");

        const playlist = await this.#findPlaylistOrFail(playlistId);
        this.#verifyOwnership(playlist, userId);

        const video = await this.videoRepository.findById(videoId);
        if (!video) {
            throw new NotFoundError("Video", videoId);
        }

        if (playlist.videos.includes(videoId)) {
            throw new BadRequestError("Video is already in the playlist");
        }

        playlist.videos.push(videoId);
        await playlist.save();

        return {
            data: await this.playlistRepository.findByIdWithOwnerAndVideos(
                playlistId
            ),
            message: "Video added to playlist successfully",
        };
    }

    async removeVideo({ playlistId, videoId, userId }) {
        ObjectIdValidator.ensureValid(playlistId, "playlist ID");
        ObjectIdValidator.ensureValid(videoId, "video ID");

        const playlist = await this.#findPlaylistOrFail(playlistId);
        this.#verifyOwnership(playlist, userId);

        const videoIndex = playlist.videos.findIndex(
            (video) => video.toString() === videoId
        );

        if (videoIndex === -1) {
            throw new BadRequestError("Video is not in the playlist");
        }

        playlist.videos.splice(videoIndex, 1);
        await playlist.save();

        return {
            data: await this.playlistRepository.findByIdWithOwnerAndVideos(
                playlistId
            ),
            message: "Video removed from playlist successfully",
        };
    }

    async #findPlaylistOrFail(playlistId) {
        const playlist = await this.playlistRepository.findById(playlistId);
        if (!playlist) {
            throw new NotFoundError("Playlist", playlistId);
        }
        return playlist;
    }

    #verifyOwnership(playlist, userId) {
        if (playlist.owner.toString() !== userId.toString()) {
            throw new ForbiddenError(
                "You are not authorized to modify this playlist"
            );
        }
    }
}

export { PlaylistService };
