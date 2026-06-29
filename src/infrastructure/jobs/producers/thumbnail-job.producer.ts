// @ts-nocheck
import { JobNames, QueueNames } from "../job.constants.js";
import { BaseJobProducer } from "./base-job.producer.js";

class ThumbnailJobProducer extends BaseJobProducer {
    constructor() {
        super({
            queueName: QueueNames.THUMBNAIL,
            context: "thumbnail-job-producer",
        });
    }

    enqueueThumbnailGeneration(payload) {
        return this.enqueue(JobNames.GENERATE_THUMBNAIL, payload);
    }
}

export { ThumbnailJobProducer };
