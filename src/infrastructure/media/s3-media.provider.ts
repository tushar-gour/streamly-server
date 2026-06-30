import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Readable } from "node:stream";

import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { appConfig } from "../../config/env.js";
import { HttpStatus } from "../../shared/constants/index.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { createLogger, serializeError } from "../logger/logger.js";
import type {
    MediaStorageProvider,
    MediaStreamProvider,
    MediaStreamRequest,
    MediaStreamResult,
    MediaUploadRequest,
    MediaUploadResult,
} from "./media-storage.types.js";

const s3Logger = createLogger("s3-media");
const RANGE_HEADER_PATTERN = /^bytes=(\d*)-(\d*)$/;

const contentTypesByExtension: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
};

const createS3Client = (): S3Client =>
    new S3Client({
        region: appConfig.aws.region,
        forcePathStyle: appConfig.aws.s3ForcePathStyle,
        credentials:
            appConfig.aws.accessKeyId && appConfig.aws.secretAccessKey
                ? {
                      accessKeyId: appConfig.aws.accessKeyId,
                      secretAccessKey: appConfig.aws.secretAccessKey,
                  }
                : undefined,
    });

const getContentType = (filePath: string, fallback?: string): string =>
    fallback ||
    contentTypesByExtension[path.extname(filePath).toLowerCase()] ||
    "application/octet-stream";

const createObjectKey = (folder: string, filePath: string): string => {
    const extension = path.extname(filePath).toLowerCase();
    const safeFolder = folder.replace(/^\/+|\/+$/g, "") || "media";
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    return `${safeFolder}/${uniqueName}`;
};

const getPublicUrl = (objectKey: string): string => {
    const baseUrl = appConfig.aws.s3PublicBaseUrl;
    if (baseUrl) return `${baseUrl.replace(/\/$/u, "")}/${objectKey}`;
    return `https://${appConfig.aws.s3Bucket}.s3.${appConfig.aws.region}.amazonaws.com/${objectKey}`;
};

const parseRange = (
    range: string | undefined,
    size: number
): { start: number; end: number } | null => {
    if (!range) return null;

    const match = RANGE_HEADER_PATTERN.exec(range);
    if (!match) {
        throw new ApiError(
            HttpStatus.RANGE_NOT_SATISFIABLE,
            "Invalid Range header"
        );
    }

    const [, rawStart, rawEnd] = match;
    if (!rawStart && !rawEnd) {
        throw new ApiError(
            HttpStatus.RANGE_NOT_SATISFIABLE,
            "Invalid Range header"
        );
    }

    const start = rawStart
        ? Number(rawStart)
        : Math.max(size - Number(rawEnd), 0);
    const end = rawEnd ? Number(rawEnd) : size - 1;

    if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 0 ||
        end >= size ||
        start > end
    ) {
        throw new ApiError(
            HttpStatus.RANGE_NOT_SATISFIABLE,
            "Invalid Range header"
        );
    }

    return { start, end };
};

const getObjectKeyFromTrustedUrl = (urlOrKey: string): string => {
    if (!urlOrKey) {
        throw new ApiError(HttpStatus.NOT_FOUND, "Media object not found");
    }

    if (!urlOrKey.startsWith("http://") && !urlOrKey.startsWith("https://")) {
        return urlOrKey.replace(/^\/+/u, "");
    }

    const parsedUrl = new URL(urlOrKey);
    const publicBaseUrl = appConfig.aws.s3PublicBaseUrl;

    if (publicBaseUrl && urlOrKey.startsWith(publicBaseUrl)) {
        return parsedUrl.pathname.replace(/^\/+/u, "");
    }

    const bucketPrefix = `${appConfig.aws.s3Bucket}.s3.`;
    if (parsedUrl.hostname.startsWith(bucketPrefix)) {
        return parsedUrl.pathname.replace(/^\/+/u, "");
    }

    throw new ApiError(HttpStatus.BAD_REQUEST, "Unsupported S3 media URL");
};

class S3MediaProvider implements MediaStorageProvider, MediaStreamProvider {
    readonly #client: S3Client;

    constructor(client = createS3Client()) {
        this.#client = client;
    }

    async upload({
        localFilePath,
        folder,
        contentType,
        resourceType = "auto",
    }: MediaUploadRequest): Promise<MediaUploadResult | null> {
        if (!localFilePath || !fs.existsSync(localFilePath)) {
            s3Logger.warn("s3 upload file missing");
            return null;
        }

        const objectKey = createObjectKey(folder, localFilePath);
        const resolvedContentType = getContentType(localFilePath, contentType);
        const stats = fs.statSync(localFilePath);

        try {
            await this.#client.send(
                new PutObjectCommand({
                    Bucket: appConfig.aws.s3Bucket,
                    Key: objectKey,
                    Body: fs.createReadStream(localFilePath),
                    ContentType: resolvedContentType,
                })
            );

            fs.unlinkSync(localFilePath);

            const publicUrl = getPublicUrl(objectKey);
            s3Logger.info(
                { resourceType, bytes: stats.size },
                "s3 upload completed"
            );

            return {
                publicId: objectKey,
                objectKey,
                url: publicUrl,
                secureUrl: publicUrl,
                resourceType,
                bytes: stats.size,
            };
        } catch (error) {
            s3Logger.error(
                { error: serializeError(error, true) },
                "s3 upload failed"
            );
            return null;
        }
    }

    async delete(objectKeyOrUrl: string): Promise<boolean> {
        const objectKey = getObjectKeyFromTrustedUrl(objectKeyOrUrl);

        await this.#client.send(
            new DeleteObjectCommand({
                Bucket: appConfig.aws.s3Bucket,
                Key: objectKey,
            })
        );

        return true;
    }

    getObjectKey(objectKeyOrUrl: string): string {
        return getObjectKeyFromTrustedUrl(objectKeyOrUrl);
    }

    async createReadUrl(
        objectKeyOrUrl: string,
        expiresInSeconds = 900
    ): Promise<string> {
        const objectKey = getObjectKeyFromTrustedUrl(objectKeyOrUrl);

        return getSignedUrl(
            this.#client,
            new GetObjectCommand({
                Bucket: appConfig.aws.s3Bucket,
                Key: objectKey,
            }),
            { expiresIn: expiresInSeconds }
        );
    }

    async stream({
        url,
        range,
    }: MediaStreamRequest): Promise<MediaStreamResult> {
        const objectKey = getObjectKeyFromTrustedUrl(url);
        const metadata = await this.#client.send(
            new HeadObjectCommand({
                Bucket: appConfig.aws.s3Bucket,
                Key: objectKey,
            })
        );
        const size = metadata.ContentLength || 0;
        const parsedRange = parseRange(range, size);
        const rangeHeader = parsedRange
            ? `bytes=${parsedRange.start}-${parsedRange.end}`
            : undefined;

        const response = await this.#client.send(
            new GetObjectCommand({
                Bucket: appConfig.aws.s3Bucket,
                Key: objectKey,
                Range: rangeHeader,
            })
        );

        const contentLength = parsedRange
            ? parsedRange.end - parsedRange.start + 1
            : size;
        const headers: Record<string, string> = {
            "Accept-Ranges": "bytes",
            "Content-Length": String(contentLength),
            "Content-Type": response.ContentType || "video/mp4",
            "Cache-Control": "public, max-age=3600",
        };

        if (parsedRange) {
            headers["Content-Range"] =
                `bytes ${parsedRange.start}-${parsedRange.end}/${size}`;
        }

        return {
            statusCode: parsedRange ? 206 : HttpStatus.OK,
            headers,
            body: response.Body as Readable,
        };
    }
}

export { S3MediaProvider };
