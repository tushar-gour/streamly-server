// @ts-nocheck
import { JobNames, QueueNames } from "../job.constants.js";
import { BaseJobProducer } from "./base-job.producer.js";

class CleanupJobProducer extends BaseJobProducer {
    constructor() {
        super({
            queueName: QueueNames.CLEANUP,
            context: "cleanup-job-producer",
        });
    }

    enqueueExpiredAuthCleanup(payload = {}) {
        return this.enqueue(JobNames.CLEANUP_EXPIRED_AUTH, payload);
    }
}

export { CleanupJobProducer };
