import fs from "node:fs/promises";

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("S3ThumbnailProvider", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.MEDIA_STORAGE_PROVIDER = "s3";
        process.env.THUMBNAIL_GENERATION_ENABLED = "true";
        process.env.THUMBNAIL_WIDTH = "1280";
        process.env.THUMBNAIL_HEIGHT = "720";
        process.env.THUMBNAIL_FORMAT = "webp";
    });

    it("extracts a frame and uploads thumbnail through S3 provider", async () => {
        const { S3ThumbnailProvider } = await import(
            "../../src/infrastructure/media/s3-thumbnail.provider.js"
        );
        const createReadUrl = vi.fn(async () => "https://signed.example/video");
        const upload = vi.fn(async () => ({
            publicId: "thumbnails/video-1.webp",
            objectKey: "thumbnails/video-1.webp",
            url: "https://cdn.example/thumbnails/video-1.webp",
            secureUrl: "https://cdn.example/thumbnails/video-1.webp",
            resourceType: "image",
            bytes: 128,
        }));
        const thumbnailExtractor = vi.fn(
            async (
                _inputUrl: string,
                outputPath: string,
                _width: number,
                _height: number,
                _format: "jpg" | "webp"
            ) => {
                await fs.writeFile(outputPath, "thumbnail");
            }
        );

        const provider = new S3ThumbnailProvider({
            s3Provider: { createReadUrl, upload },
            thumbnailExtractor,
        });
        const result = await provider.generateFromVideo({
            videoId: "video-1",
            videoUrl: "videos/video-1.mp4",
        });

        expect(createReadUrl).toHaveBeenCalledWith("videos/video-1.mp4", 900);
        expect(thumbnailExtractor).toHaveBeenCalledWith(
            "https://signed.example/video",
            expect.stringContaining("video-1.webp"),
            1280,
            720,
            "webp"
        );
        expect(upload).toHaveBeenCalledWith(
            expect.objectContaining({
                folder: "thumbnails",
                resourceType: "image",
                contentType: "image/webp",
            })
        );
        expect(result).toEqual({
            generated: true,
            provider: "s3",
            thumbnailUrl: "https://cdn.example/thumbnails/video-1.webp",
            width: 1280,
            height: 720,
            format: "webp",
        });
    });
});
