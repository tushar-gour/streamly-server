// @ts-nocheck
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { ApiError } from "../../shared/errors/api-error.js";
import { FileUploadConfig } from "../../shared/constants/index.js";

class FileUploadMiddleware {
    static #diskStorage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, "./public/temp");
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
            const ext = path.extname(file.originalname);
            const baseName = path
                .basename(file.originalname, ext)
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "-")
                .slice(0, 50);
            cb(null, `${baseName}-${uniqueSuffix}${ext}`);
        },
    });

    static #memoryStorage = multer.memoryStorage();

    static #imageFilter = (req, file, cb) => {
        if (FileUploadConfig.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new ApiError(
                    400,
                    `Invalid file type. Allowed types: ${FileUploadConfig.ALLOWED_IMAGE_TYPES.join(", ")}`
                ),
                false
            );
        }
    };

    static #videoFilter = (req, file, cb) => {
        if (FileUploadConfig.ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new ApiError(
                    400,
                    `Invalid file type. Allowed types: ${FileUploadConfig.ALLOWED_VIDEO_TYPES.join(", ")}`
                ),
                false
            );
        }
    };

    static #mediaFilter = (req, file, cb) => {
        const allowedTypes = [
            ...FileUploadConfig.ALLOWED_IMAGE_TYPES,
            ...FileUploadConfig.ALLOWED_VIDEO_TYPES,
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new ApiError(
                    400,
                    `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`
                ),
                false
            );
        }
    };

    static createUploader(options = {}) {
        const { storage = "disk", fileFilter = null, limits = {} } = options;

        return multer({
            storage:
                storage === "memory" ? this.#memoryStorage : this.#diskStorage,
            fileFilter,
            limits: {
                fileSize: limits.fileSize || FileUploadConfig.MAX_FILE_SIZE,
                files: limits.files || 5,
                ...limits,
            },
        });
    }

    static upload = this.createUploader();

    static uploadImage = this.createUploader({
        fileFilter: this.#imageFilter,
        limits: { fileSize: 10 * 1024 * 1024 },
    });

    static uploadVideo = this.createUploader({
        fileFilter: this.#videoFilter,
        limits: { fileSize: FileUploadConfig.MAX_FILE_SIZE },
    });

    static uploadMedia = this.createUploader({
        fileFilter: this.#mediaFilter,
    });

    static handleError = (err, req, res, next) => {
        if (err instanceof multer.MulterError) {
            let message = "File upload error";

            switch (err.code) {
                case "LIMIT_FILE_SIZE":
                    message = `File too large. Maximum size: ${FileUploadConfig.MAX_FILE_SIZE / (1024 * 1024)}MB`;
                    break;
                case "LIMIT_FILE_COUNT":
                    message = "Too many files uploaded";
                    break;
                case "LIMIT_UNEXPECTED_FILE":
                    message = `Unexpected field name: ${err.field}`;
                    break;
                case "LIMIT_PART_COUNT":
                    message = "Too many parts in multipart form";
                    break;
                case "LIMIT_FIELD_KEY":
                    message = "Field name too long";
                    break;
                case "LIMIT_FIELD_VALUE":
                    message = "Field value too long";
                    break;
                case "LIMIT_FIELD_COUNT":
                    message = "Too many fields";
                    break;
            }

            return next(new ApiError(400, message));
        }

        next(err);
    };
}

export const upload = FileUploadMiddleware.upload;
export const uploadImage = FileUploadMiddleware.uploadImage;
export const uploadVideo = FileUploadMiddleware.uploadVideo;
export const uploadMedia = FileUploadMiddleware.uploadMedia;
export const handleUploadError = FileUploadMiddleware.handleError;
export { FileUploadMiddleware };
