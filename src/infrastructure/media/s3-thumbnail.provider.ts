import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import ffmpegStaticPath from "ffmpeg-static";

import { appConfig } from "../../config/env.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { createLogger, serializeError } from "../logger/logger.js";
import { S3MediaProvider } from "./s3-media.provider.js";
import type {
    ThumbnailGenerationRequest,
    ThumbnailGenerationResult,
    ThumbnailProvider,
} from "./media-storage.types.js";

const s3ThumbnailLogger = createLogger("s3-thumbnail");
const SUPPORTED_FORMATS = new Set(["jpg", "jpeg", "webp"]);

const normalizeFormat = (format: string): "jpg" | "webp" => {
    const normalizedFormat = format.toLowerCase();
    if (!SUPPORTED_FORMATS.has(normalizedFormat)) return "jpg";
    if (normalizedFormat === "webp") return "webp";
    return "jpg";
};

const getContentType = (format: "jpg" | "webp"): string =>
    format === "webp" ? "image/webp" : "image/jpeg";

const runFfmpeg = (
    inputUrl: string,
    outputPath: string,
    width: number,
    height: number,
    format: "jpg" | "webp"
): Promise<void> =>
    new Promise((resolve, reject) => {
        const ffmpegPath = ffmpegStaticPath || "ffmpeg";
        const videoFilter =
            `scale=${width}:${height}:force_original_aspect_ratio=increase,` +
            `crop=${width}:${height}`;
        const formatArgs =
            format === "webp"
                ? ["-vcodec", "libwebp", "-quality", "82"]
                : ["-q:v", "2"];

        const process = spawn(ffmpegPath, [
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-ss",
            "00:00:01",
            "-i",
            inputUrl,
            "-frames:v",
            "1",
            "-vf",
            videoFilter,
            ...formatArgs,
            outputPath,
        ]);

        let stderr = "";

        process.stderr.on("data", (chunk) => {
            stderr += String(chunk);
        });

        process.on("error", reject);
        process.on("close", (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(
                new Error(
                    stderr.trim() ||
                        `ffmpeg thumbnail extraction failed with code ${code}`
                )
            );
        });
    });

type S3ThumbnailProviderOptions = {
    s3Provider?: Pick<S3MediaProvider, "createReadUrl" | "upload">;
    thumbnailExtractor?: typeof runFfmpeg;
};

class S3ThumbnailProvider implements ThumbnailProvider {
    readonly #s3Provider: Pick<S3MediaProvider, "createReadUrl" | "upload">;
    readonly #thumbnailExtractor: typeof runFfmpeg;

    constructor({
        s3Provider = new S3MediaProvider(),
        thumbnailExtractor = runFfmpeg,
    }: S3ThumbnailProviderOptions = {}) {
        this.#s3Provider = s3Provider;
        this.#thumbnailExtractor = thumbnailExtractor;
    }

    async generateFromVideo({
        videoId,
        videoUrl,
    }: ThumbnailGenerationRequest): Promise<ThumbnailGenerationResult> {
        if (!appConfig.media.thumbnailGenerationEnabled) {
            return {
                generated: false,
                mode: "disabled",
            };
        }

        const format = normalizeFormat(appConfig.media.thumbnailFormat);
        const tempDirectory = await fs.mkdtemp(
            path.join(os.tmpdir(), "streamly-thumbnail-")
        );
        const outputPath = path.join(tempDirectory, `${videoId}.${format}`);

        try {
            const signedVideoUrl = await this.#s3Provider.createReadUrl(
                videoUrl,
                900
            );

            await this.#thumbnailExtractor(
                signedVideoUrl,
                outputPath,
                appConfig.media.thumbnailWidth,
                appConfig.media.thumbnailHeight,
                format
            );

            const upload = await this.#s3Provider.upload({
                localFilePath: outputPath,
                folder: "thumbnails",
                resourceType: "image",
                contentType: getContentType(format),
            });

            if (!upload) {
                throw new ApiError(500, "Failed to upload generated thumbnail");
            }

            s3ThumbnailLogger.info(
                {
                    videoId,
                    width: appConfig.media.thumbnailWidth,
                    height: appConfig.media.thumbnailHeight,
                    format,
                },
                "s3 thumbnail generated"
            );

            return {
                generated: true,
                provider: "s3",
                thumbnailUrl: upload.secureUrl || upload.url,
                width: appConfig.media.thumbnailWidth,
                height: appConfig.media.thumbnailHeight,
                format,
            };
        } catch (error) {
            s3ThumbnailLogger.warn(
                {
                    videoId,
                    error: serializeError(error, true),
                },
                "s3 thumbnail generation failed"
            );
            throw error;
        } finally {
            await fs.rm(tempDirectory, { force: true, recursive: true });
        }
    }
}

export { S3ThumbnailProvider };
