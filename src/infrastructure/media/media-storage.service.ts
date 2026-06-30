// @ts-nocheck
import { appConfig } from "../../config/env.js";
import { FileUploadConfig } from "../../shared/constants/index.js";
import { cloudinaryService } from "../cloudinary/cloudinary.service.js";
import { S3MediaProvider } from "./s3-media.provider.js";
import type {
    MediaStorageProvider,
    MediaUploadResult,
} from "./media-storage.types.js";

class MediaStorageService {
    readonly #s3Provider: MediaStorageProvider;

    constructor(s3Provider: MediaStorageProvider = new S3MediaProvider()) {
        this.#s3Provider = s3Provider;
    }

    async upload(
        localFilePath: string,
        options: Record<string, unknown> = {}
    ): Promise<MediaUploadResult | null> {
        if (appConfig.media.storageProvider === "s3") {
            return this.#s3Provider.upload({
                localFilePath,
                folder: String(
                    options.folder || FileUploadConfig.UPLOAD_FOLDER
                ),
                resourceType: String(
                    options.resource_type || options.resourceType || "auto"
                ) as "auto" | "image" | "video" | "raw",
                contentType: options.contentType as string | undefined,
            });
        }

        return cloudinaryService!.upload(localFilePath, options);
    }

    async delete(
        objectKeyOrUrl: string,
        resourceType = "image"
    ): Promise<boolean> {
        if (appConfig.media.storageProvider === "s3") {
            return this.#s3Provider.delete?.(objectKeyOrUrl) ?? false;
        }

        return cloudinaryService!.delete(objectKeyOrUrl, resourceType);
    }

    extractPublicId(url: string): string | null {
        if (appConfig.media.storageProvider === "s3") return url;
        return cloudinaryService!.extractPublicId(url);
    }
}

const mediaStorageService = new MediaStorageService();

export { MediaStorageService, mediaStorageService };
