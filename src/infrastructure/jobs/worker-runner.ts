// @ts-nocheck
import { appConfig } from "../../config/env.js";
import connectDB, {
    databaseConnection,
} from "../database/prisma-connection.js";
import { createLogger, serializeError } from "../logger/logger.js";
import { redisService } from "../redis/redis.service.js";
import { JobNames, QueueNames } from "./job.constants.js";
import { processCleanupJob } from "./processors/cleanup.processor.js";
import { processEmailJob } from "./processors/email.processor.js";
import { processNotificationJob } from "./processors/notification.processor.js";
import { processThumbnailJob } from "./processors/thumbnail.processor.js";
import { createQueueWorker } from "./workers/worker-factory.js";

const workerRunnerLogger = createLogger("worker-runner");

class WorkerRunner {
    constructor() {
        this.workers = [];
        this.isShuttingDown = false;
    }

    async start() {
        if (!appConfig.jobs.enabled) {
            workerRunnerLogger.info("jobs disabled by configuration");
            return;
        }

        workerRunnerLogger.info("starting workers");
        await connectDB();
        await redisService.connect();

        this.#registerWorkers();

        workerRunnerLogger.info(
            {
                workerCount: this.workers.length,
                concurrency: appConfig.jobs.workerConcurrency,
            },
            "workers started"
        );
    }

    async shutdown(signal = "manual") {
        if (this.isShuttingDown) {
            return;
        }

        this.isShuttingDown = true;
        workerRunnerLogger.info({ signal }, "worker shutdown started");

        try {
            await Promise.all(this.workers.map((worker) => worker.close()));
            await redisService.disconnect();
            await databaseConnection.disconnect();
            workerRunnerLogger.info("worker shutdown complete");
        } catch (error) {
            workerRunnerLogger.error(
                { error: serializeError(error, true) },
                "worker shutdown failed"
            );
            throw error;
        }
    }

    #registerWorkers() {
        if (appConfig.jobs.emailQueueEnabled) {
            this.workers.push(
                createQueueWorker({
                    queueName: QueueNames.EMAIL,
                    processor: processEmailJob,
                    context: "email-worker",
                })
            );
        }

        if (appConfig.jobs.notificationQueueEnabled) {
            this.workers.push(
                createQueueWorker({
                    queueName: QueueNames.NOTIFICATION,
                    processor: processNotificationJob,
                    context: "notification-worker",
                })
            );
        }

        if (appConfig.jobs.thumbnailQueueEnabled) {
            this.workers.push(
                createQueueWorker({
                    queueName: QueueNames.THUMBNAIL,
                    processor: processThumbnailJob,
                    context: "thumbnail-worker",
                })
            );
        }

        if (appConfig.jobs.cleanupQueueEnabled) {
            this.workers.push(
                createQueueWorker({
                    queueName: QueueNames.CLEANUP,
                    processor: processCleanupJob,
                    context: "cleanup-worker",
                })
            );
        }

        workerRunnerLogger.info(
            {
                queues: this.workers.map((worker) => worker.name),
                supportedJobs: Object.values(JobNames),
            },
            "workers registered"
        );
    }
}

export { WorkerRunner };
