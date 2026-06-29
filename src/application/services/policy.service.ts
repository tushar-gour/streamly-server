// @ts-nocheck
class PolicyService {
    constructor({ videoRepository, commentRepository, playlistRepository }) {
        this.videoRepository = videoRepository;
        this.commentRepository = commentRepository;
        this.playlistRepository = playlistRepository;
    }

    async canUpdateVideo({ userId, params }) {
        return this.#ownsVideo(userId, params.videoId);
    }

    async canDeleteVideo({ userId, params }) {
        return this.#ownsVideo(userId, params.videoId);
    }

    async canToggleVideoPublish({ userId, params }) {
        return this.#ownsVideo(userId, params.videoId);
    }

    async canUpdateComment({ userId, params }) {
        return this.#ownsComment(userId, params.commentId);
    }

    async canDeleteComment({ userId, params }) {
        return this.#ownsComment(userId, params.commentId);
    }

    async canUpdatePlaylist({ userId, params }) {
        return this.#ownsPlaylist(userId, params.playlistId);
    }

    async canDeletePlaylist({ userId, params }) {
        return this.#ownsPlaylist(userId, params.playlistId);
    }

    async canManagePlaylistVideos({ userId, params }) {
        return this.#ownsPlaylist(userId, params.playlistId);
    }

    canUpdateUserProfile({ userId, targetUserId }) {
        return userId?.toString() === targetUserId?.toString();
    }

    async #ownsVideo(userId, videoId) {
        const video = await this.videoRepository.findById(videoId);
        return video?.owner?.toString() === userId?.toString();
    }

    async #ownsComment(userId, commentId) {
        const comment = await this.commentRepository.findById(commentId);
        return comment?.owner?.toString() === userId?.toString();
    }

    async #ownsPlaylist(userId, playlistId) {
        const playlist = await this.playlistRepository.findById(playlistId);
        return playlist?.owner?.toString() === userId?.toString();
    }
}

export { PolicyService };
