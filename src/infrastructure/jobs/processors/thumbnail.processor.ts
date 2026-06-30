// @ts-nocheck
import { appConfig } from "../../../config/env.js";
import { PrismaVideoRepository } from "../../repositories/video.repository.js";
import { CloudinaryThumbnailProvider } from "../../media/cloudinary-thumbnail.provider.js";
import { JobNames } from "../job.constants.js";

const thumbnailProvider = new CloudinaryThumbnailProvider();
const videoRepository = new PrismaVideoRepository();

const processThumbnailJob = async (job) => {
    if (job.name !== JobNames.GENERATE_THUMBNAIL) {
        throw new Error(`Unsupported thumbnail job: ${job.name}`);
    }

    if (!appConfig.jobs.thumbnailQueueEnabled) {
        return {
            generated: false,
            mode: "disabled",
        };
    }

    const { videoId, videoUrl } = job.data;
    const result = await thumbnailProvider.generateFromVideo({
        videoId,
        videoUrl,
    });

    if (!result.generated) {
        return result;
    }

    await videoRepository.updateThumbnail(videoId, result.thumbnailUrl);

    return {
        generated: true,
        provider: result.provider,
        width: result.width,
        height: result.height,
        format: result.format,
    };
};

export { processThumbnailJob };
