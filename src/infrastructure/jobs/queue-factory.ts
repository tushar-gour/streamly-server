// @ts-nocheck
import { Queue } from "bullmq";

import { getDefaultJobOptions } from "./job-options.js";
import { createBullMqConnection } from "./redis-connection.js";

const createQueue = (queueName) =>
    new Queue(queueName, {
        connection: createBullMqConnection(),
        defaultJobOptions: getDefaultJobOptions(),
    });

export { createQueue };
