// @ts-nocheck
import { Worker } from "bullmq";

import { appConfig } from "../../../config/env.js";
import { createLogger, serializeError } from "../../logger/logger.js";
import { createBullMqConnection } from "../redis-connection.js";

const createQueueWorker = ({ queueName, processor, context }) => {
    const workerLogger = createLogger(context);
    const worker = new Worker(queueName, processor, {
        connection: createBullMqConnection(),
        concurrency: appConfig.jobs.workerConcurrency,
    });

    worker.on("ready", () => {
        workerLogger.info({ queueName }, "worker ready");
    });

    worker.on("active", (job) => {
        workerLogger.info(
            {
                queueName,
                jobName: job.name,
                jobId: job.id,
                attempt: job.attemptsMade + 1,
            },
            "job started"
        );
    });

    worker.on("completed", (job, result) => {
        workerLogger.info(
            {
                queueName,
                jobName: job.name,
                jobId: job.id,
                attemptsMade: job.attemptsMade,
                result,
            },
            "job completed"
        );
    });

    worker.on("failed", (job, error) => {
        workerLogger.error(
            {
                queueName,
                jobName: job?.name,
                jobId: job?.id,
                attemptsMade: job?.attemptsMade,
                error: serializeError(error),
            },
            "job failed"
        );
    });

    worker.on("error", (error) => {
        workerLogger.error(
            {
                queueName,
                error: serializeError(error, true),
            },
            "worker error"
        );
    });

    return worker;
};

export { createQueueWorker };
