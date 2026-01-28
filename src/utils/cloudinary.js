import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { FileUploadConfig } from "../constants.js";

class CloudinaryService {
    static #instance = null;
    #isConfigured = false;

    constructor() {
        if (CloudinaryService.#instance) {
            return CloudinaryService.#instance;
        }
        this.#configure();
        CloudinaryService.#instance = this;
    }

    static getInstance() {
        if (!CloudinaryService.#instance) {
            CloudinaryService.#instance = new CloudinaryService();
        }
        return CloudinaryService.#instance;
    }

    #configure() {
        if (this.#isConfigured) return;

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true,
        });

        this.#isConfigured = true;
        console.log("✓ Cloudinary configured successfully");
    }

    async upload(localFilePath, options = {}) {
        if (!localFilePath) {
            console.warn("CloudinaryService: No file path provided");
            return null;
        }

        try {
            if (!fs.existsSync(localFilePath)) {
                console.warn(
                    `CloudinaryService: File not found at ${localFilePath}`
                );
                return null;
            }

            const uploadOptions = {
                resource_type: options.resourceType || "auto",
                folder: options.folder || FileUploadConfig.UPLOAD_FOLDER,
                public_id: options.publicId,
                use_filename: true,
                unique_filename: true,
                overwrite: false,
                ...options,
            };

            console.log(
                `CloudinaryService: Uploading file from ${localFilePath}`
            );
            const response = await cloudinary.uploader.upload(
                localFilePath,
                uploadOptions
            );

            await this.#deleteLocalFile(localFilePath);

            console.log(
                `CloudinaryService: File uploaded successfully - ${response.public_id}`
            );

            return {
                publicId: response.public_id,
                url: response.url,
                secureUrl: response.secure_url,
                format: response.format,
                width: response.width,
                height: response.height,
                duration: response.duration,
                bytes: response.bytes,
                resourceType: response.resource_type,
            };
        } catch (error) {
            console.error("CloudinaryService: Upload failed", error.message);
            await this.#deleteLocalFile(localFilePath);
            return null;
        }
    }

    async uploadMultiple(localFilePaths, options = {}) {
        const results = await Promise.allSettled(
            localFilePaths.map((path) => this.upload(path, options))
        );

        return results
            .filter((result) => result.status === "fulfilled" && result.value)
            .map((result) => result.value);
    }

    async delete(publicId, resourceType = "image") {
        if (!publicId) {
            console.warn(
                "CloudinaryService: No public ID provided for deletion"
            );
            return false;
        }

        try {
            const result = await cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType,
            });

            const success = result.result === "ok";
            if (success) {
                console.log(`CloudinaryService: File deleted - ${publicId}`);
            } else {
                console.warn(
                    `CloudinaryService: Deletion returned - ${result.result}`
                );
            }

            return success;
        } catch (error) {
            console.error("CloudinaryService: Deletion failed", error.message);
            return false;
        }
    }

    async deleteMultiple(publicIds, resourceType = "image") {
        if (!publicIds?.length) {
            return { deleted: 0, failed: 0 };
        }

        try {
            const result = await cloudinary.api.delete_resources(publicIds, {
                resource_type: resourceType,
            });

            const deleted = Object.values(result.deleted).filter(
                (v) => v === "deleted"
            ).length;
            console.log(`CloudinaryService: Deleted ${deleted} files`);

            return {
                deleted,
                failed: publicIds.length - deleted,
                details: result.deleted,
            };
        } catch (error) {
            console.error(
                "CloudinaryService: Bulk deletion failed",
                error.message
            );
            return { deleted: 0, failed: publicIds.length };
        }
    }

    getOptimizedUrl(publicId, options = {}) {
        return cloudinary.url(publicId, {
            fetch_format: "auto",
            quality: options.quality || "auto",
            width: options.width,
            height: options.height,
            crop: options.crop || "fill",
            ...options,
        });
    }

    getVideoStreamUrl(publicId, quality = "auto") {
        const qualityMap = { auto: "auto", sd: 480, hd: 1080 };

        return cloudinary.url(publicId, {
            resource_type: "video",
            format: "mp4",
            video_codec: "auto",
            height: qualityMap[quality] || qualityMap.auto,
        });
    }

    extractPublicId(url) {
        if (!url) return null;

        try {
            const regex = /\/v\d+\/(.+)\.[a-z]+$/i;
            const match = url.match(regex);
            return match ? match[1] : null;
        } catch {
            return null;
        }
    }

    async healthCheck() {
        const start = Date.now();

        try {
            await cloudinary.api.ping();
            return {
                status: "healthy",
                latency: Date.now() - start,
                configured: this.#isConfigured,
            };
        } catch (error) {
            return {
                status: "unhealthy",
                latency: Date.now() - start,
                error: error.message,
            };
        }
    }

    async #deleteLocalFile(filePath) {
        try {
            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(
                    `CloudinaryService: Local file cleaned up - ${filePath}`
                );
            }
        } catch (error) {
            console.warn(
                `CloudinaryService: Failed to delete local file - ${filePath}`
            );
        }
    }
}

const cloudinaryService = CloudinaryService.getInstance();

const uploadOnCloudinary = async (localFilePath, options = {}) => {
    return cloudinaryService.upload(localFilePath, options);
};

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    return cloudinaryService.delete(publicId, resourceType);
};

export {
    CloudinaryService,
    cloudinaryService,
    uploadOnCloudinary,
    deleteFromCloudinary,
};
