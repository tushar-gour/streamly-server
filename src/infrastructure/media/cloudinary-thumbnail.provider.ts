import { appConfig } from "../../config/env.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { CloudinaryService } from "../cloudinary/cloudinary.service.js";

const thumbnailCloudinaryService = new CloudinaryService();

class CloudinaryThumbnailProvider {
    async generateFromVideo({
        videoUrl,
    }: {
        videoId: string;
        videoUrl: string;
    }) {
        if (!appConfig.media.thumbnailGenerationEnabled) {
            return {
                generated: false,
                mode: "disabled",
            };
        }

        const thumbnailUrl = thumbnailCloudinaryService.getVideoThumbnailUrl(
            videoUrl,
            {
                width: appConfig.media.thumbnailWidth,
                height: appConfig.media.thumbnailHeight,
                format: appConfig.media.thumbnailFormat,
            }
        );

        if (!thumbnailUrl) {
            throw new ApiError(
                422,
                "Unable to generate thumbnail from video URL"
            );
        }

        return {
            generated: true,
            provider: "cloudinary",
            thumbnailUrl,
            width: appConfig.media.thumbnailWidth,
            height: appConfig.media.thumbnailHeight,
            format: appConfig.media.thumbnailFormat,
        };
    }
}

export { CloudinaryThumbnailProvider };
