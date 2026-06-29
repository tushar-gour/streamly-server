import { appConfig } from "../../../config/env.js";
import { JobNames } from "../job.constants.js";

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

    return {
        generated: false,
        mode: "placeholder",
    };
};

export { processThumbnailJob };
