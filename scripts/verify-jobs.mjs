import { Queue, QueueEvents, Worker } from "bullmq";

import { appConfig } from "../src/config/env.js";
import {
    JobNames,
    QueueNames,
} from "../src/infrastructure/jobs/job.constants.js";
import { getDefaultJobOptions } from "../src/infrastructure/jobs/job-options.js";
import { createBullMqConnection } from "../src/infrastructure/jobs/redis-connection.js";

const queueConnection = createBullMqConnection();
const workerConnection = createBullMqConnection();
const eventsConnection = createBullMqConnection();

let queue;
let worker;
let queueEvents;

try {
    if (!appConfig.redis.enabled) {
        throw new Error(
            "Redis is disabled. Enable Redis before verifying jobs."
        );
    }

    if (!appConfig.jobs.enabled) {
        throw new Error("Jobs are disabled. Set JOBS_ENABLED=true.");
    }

    queue = new Queue(QueueNames.VERIFICATION, {
        connection: queueConnection,
        defaultJobOptions: getDefaultJobOptions(),
    });

    queueEvents = new QueueEvents(QueueNames.VERIFICATION, {
        connection: eventsConnection,
    });

    worker = new Worker(
        QueueNames.VERIFICATION,
        async (job) => {
            if (job.name !== JobNames.VERIFY_JOBS_HEALTH) {
                throw new Error(`Unexpected verification job: ${job.name}`);
            }

            return {
                ok: true,
                queueName: QueueNames.VERIFICATION,
            };
        },
        {
            connection: workerConnection,
            concurrency: 1,
        }
    );

    await queueEvents.waitUntilReady();
    await worker.waitUntilReady();

    const job = await queue.add(
        JobNames.VERIFY_JOBS_HEALTH,
        {
            createdAt: new Date().toISOString(),
        },
        {
            attempts: 1,
            removeOnComplete: true,
            removeOnFail: true,
        }
    );

    const result = await job.waitUntilFinished(queueEvents, 30000);

    console.log("Jobs verification passed.");
    console.log(`Queue: ${QueueNames.VERIFICATION}`);
    console.log(`Job: ${JobNames.VERIFY_JOBS_HEALTH}`);
    console.log(`Result: ${result.ok}`);
} catch (error) {
    console.error("Jobs verification failed.");
    console.error(error.message);
    process.exitCode = 1;
} finally {
    await worker?.close().catch(() => {});
    await queueEvents?.close().catch(() => {});
    await queue?.close().catch(() => {});
    queueConnection.disconnect();
    workerConnection.disconnect();
    eventsConnection.disconnect();
}
