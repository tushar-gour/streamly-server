import { beforeEach, describe, expect, it, vi } from "vitest";

describe("thumbnail generation", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it("generates a Cloudinary thumbnail URL from a stored video URL", async () => {
        process.env.THUMBNAIL_GENERATION_ENABLED = "true";
        process.env.CLOUDINARY_CLOUD_NAME = "demo";
        process.env.CLOUDINARY_API_KEY = "test-key";
        process.env.CLOUDINARY_API_SECRET = "test-secret";

        const { CloudinaryThumbnailProvider } = await import(
            "../../src/infrastructure/media/cloudinary-thumbnail.provider.js"
        );

        const provider = new CloudinaryThumbnailProvider();
        const result = await provider.generateFromVideo({
            videoId: "507f1f77bcf86cd799439011",
            videoUrl:
                "https://res.cloudinary.com/demo/video/upload/v12345/streamly/videos/sample.mp4",
        });

        expect(result.generated).toBe(true);
        expect(result.provider).toBe("cloudinary");
        expect(result.thumbnailUrl).toContain(
            "https://res.cloudinary.com/demo/video/upload"
        );
        expect(result.thumbnailUrl).toContain("streamly/videos/sample.jpg");
    });

    it("updates video thumbnail from thumbnail processor", async () => {
        const updateThumbnail = vi.fn(async () => ({}));

        vi.doMock(
            "../../src/infrastructure/repositories/video.repository.js",
            () => ({
                PrismaVideoRepository: class {
                    updateThumbnail = updateThumbnail;
                },
            })
        );

        vi.doMock(
            "../../src/infrastructure/media/cloudinary-thumbnail.provider.js",
            () => ({
                CloudinaryThumbnailProvider: class {
                    async generateFromVideo() {
                        return {
                            generated: true,
                            provider: "cloudinary",
                            thumbnailUrl: "https://example.com/thumb.jpg",
                            width: 1280,
                            height: 720,
                            format: "jpg",
                        };
                    }
                },
            })
        );

        process.env.THUMBNAIL_QUEUE_ENABLED = "true";
        process.env.THUMBNAIL_GENERATION_ENABLED = "true";

        const { processThumbnailJob } = await import(
            "../../src/infrastructure/jobs/processors/thumbnail.processor.js"
        );

        const result = await processThumbnailJob({
            name: "thumbnail.generate",
            data: {
                videoId: "507f1f77bcf86cd799439011",
                videoUrl: "https://example.com/video.mp4",
            },
        });

        expect(result).toEqual({
            generated: true,
            provider: "cloudinary",
            width: 1280,
            height: 720,
            format: "jpg",
        });
        expect(updateThumbnail).toHaveBeenCalledWith(
            "507f1f77bcf86cd799439011",
            "https://example.com/thumb.jpg"
        );
    });
});
