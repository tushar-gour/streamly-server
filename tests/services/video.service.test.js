import { describe, expect, it, vi } from "vitest";

import { VideoService } from "../../src/application/services/video.service.js";
import { createTestVideo } from "../factories/video.factory.js";

describe("VideoService", () => {
    it("uses cache wrapper for video list reads", async () => {
        const videos = [createTestVideo()];
        const videoRepository = {
            getPublishedVideos: vi.fn().mockResolvedValue({
                videos,
                totalDocs: 1,
            }),
        };
        const cacheService = {
            remember: vi.fn(async (_key, _ttl, loader) => loader()),
        };
        const service = new VideoService({
            videoRepository,
            userRepository: {},
            likeRepository: {},
            commentRepository: {},
            cloudinaryService: {},
            cacheService,
        });

        const result = await service.getAll({ page: "1", limit: "10" });

        expect(result.data).toEqual(videos);
        expect(result.pagination.totalCount).toBe(1);
        expect(cacheService.remember).toHaveBeenCalledTimes(1);
        expect(videoRepository.getPublishedVideos).toHaveBeenCalledTimes(1);
    });

    it("does not cache video detail because views are incremented", async () => {
        const videoId = "0123456789abcdef01234567";
        const video = createTestVideo({ _id: videoId });
        const videoRepository = {
            getVideoDetails: vi.fn().mockResolvedValue([video]),
            incrementViews: vi.fn().mockResolvedValue(video),
        };
        const userRepository = {
            addToWatchHistory: vi.fn(),
        };
        const cacheService = {
            remember: vi.fn(),
        };
        const service = new VideoService({
            videoRepository,
            userRepository,
            likeRepository: {},
            commentRepository: {},
            cloudinaryService: {},
            cacheService,
        });

        const result = await service.getById({
            videoId,
            currentUserId: null,
        });

        expect(result.data).toEqual(video);
        expect(videoRepository.incrementViews).toHaveBeenCalledWith(videoId);
        expect(cacheService.remember).not.toHaveBeenCalled();
    });
});
