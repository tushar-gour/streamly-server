// @ts-nocheck
import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";

import { VideoService } from "../../src/application/services/video.service.js";
import { CloudinaryStreamProvider } from "../../src/infrastructure/media/cloudinary-stream.provider.js";
import { createId } from "../../src/shared/helpers/id-generator.js";

const createVideoService = ({ video, providerResult, permissions = false }) => {
    const mediaStreamService = {
        streamVideo: vi.fn(async () => providerResult),
    };

    return {
        mediaStreamService,
        service: new VideoService({
            videoRepository: {
                findById: vi.fn(async () => video),
            },
            userRepository: {},
            likeRepository: {},
            commentRepository: {},
            cloudinaryService: {},
            cacheService: {},
            authorizationService: {
                hasAnyPermission: vi.fn(async () => permissions),
            },
            mediaStreamService,
        }),
    };
};

describe("Video streaming service", () => {
    it("returns 206 and range headers for public video range requests", async () => {
        const videoId = createId();
        const ownerId = createId();
        const { service, mediaStreamService } = createVideoService({
            video: {
                _id: videoId,
                owner: ownerId,
                videoFile: "https://res.cloudinary.com/demo/video.mp4",
                isPublished: true,
            },
            providerResult: {
                statusCode: 206,
                headers: {
                    "Accept-Ranges": "bytes",
                    "Content-Range": "bytes 0-99/1000",
                    "Content-Length": "100",
                    "Content-Type": "video/mp4",
                },
                body: Readable.from(["chunk"]),
            },
        });

        const result = await service.stream({
            videoId,
            currentUserId: undefined,
            range: "bytes=0-99",
        });

        expect(result.statusCode).toBe(206);
        expect(result.headers["Accept-Ranges"]).toBe("bytes");
        expect(result.headers["Content-Range"]).toBe("bytes 0-99/1000");
        expect(mediaStreamService.streamVideo).toHaveBeenCalledWith(
            "https://res.cloudinary.com/demo/video.mp4",
            "bytes=0-99"
        );
    });

    it("allows full-response streaming when Range is absent", async () => {
        const videoId = createId();
        const ownerId = createId();
        const { service } = createVideoService({
            video: {
                _id: videoId,
                owner: ownerId,
                videoFile: "https://res.cloudinary.com/demo/video.mp4",
                isPublished: true,
            },
            providerResult: {
                statusCode: 200,
                headers: {
                    "Accept-Ranges": "bytes",
                    "Content-Type": "video/mp4",
                },
                body: Readable.from(["chunk"]),
            },
        });

        const result = await service.stream({
            videoId,
            currentUserId: undefined,
            range: undefined,
        });

        expect(result.statusCode).toBe(200);
        expect(result.headers["Accept-Ranges"]).toBe("bytes");
    });

    it("rejects private video streaming without authentication", async () => {
        const videoId = createId();
        const ownerId = createId();
        const { service } = createVideoService({
            video: {
                _id: videoId,
                owner: ownerId,
                videoFile: "https://res.cloudinary.com/demo/video.mp4",
                isPublished: false,
            },
            providerResult: {},
        });

        await expect(
            service.stream({
                videoId,
                currentUserId: undefined,
                range: "bytes=0-99",
            })
        ).rejects.toMatchObject({ statusCode: 401 });
    });

    it("allows private video streaming for owners", async () => {
        const videoId = createId();
        const ownerId = createId();
        const { service } = createVideoService({
            video: {
                _id: videoId,
                owner: ownerId,
                videoFile: "https://res.cloudinary.com/demo/video.mp4",
                isPublished: false,
            },
            providerResult: {
                statusCode: 206,
                headers: { "Accept-Ranges": "bytes" },
                body: Readable.from(["chunk"]),
            },
        });

        const result = await service.stream({
            videoId,
            currentUserId: ownerId,
            range: "bytes=0-99",
        });

        expect(result.statusCode).toBe(206);
    });
});

describe("Cloudinary stream provider validation", () => {
    it("rejects invalid Range headers before remote fetch", async () => {
        const provider = new CloudinaryStreamProvider();

        await expect(
            provider.stream({
                url: "https://res.cloudinary.com/demo/video.mp4",
                range: "items=0-99",
            })
        ).rejects.toMatchObject({ statusCode: 416 });
    });
});
