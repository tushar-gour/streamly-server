import { appConfig } from "../../../config/env.js";
import { createLogger, serializeError } from "../../logger/logger.js";
import { queueRegistry } from "../queue-registry.js";

class BaseJobProducer {
    constructor({ queueName, context }) {
        this.queueName = queueName;
        this.logger = createLogger(context);
    }

    async enqueue(jobName, payload = {}, options = {}) {
        if (!appConfig.jobs.enabled) {
            this.logger.info(
                { queueName: this.queueName, jobName },
                "job skipped because jobs are disabled"
            );
            return null;
        }

        const queue = queueRegistry.getQueue(this.queueName);
        const job = await queue.add(jobName, payload, options);

        this.logger.info(
            {
                queueName: this.queueName,
                jobName,
                jobId: job.id,
            },
            "job enqueued"
        );

        return job;
    }

    logEnqueueFailure(error, jobName) {
        this.logger.warn(
            {
                queueName: this.queueName,
                jobName,
                error: serializeError(error),
            },
            "job enqueue failed"
        );
    }
}

export { BaseJobProducer };
