import Redis from "ioredis";

import { appConfig } from "../../config/env.js";

const createBullMqConnection = () =>
    new Redis(appConfig.redis.url, {
        lazyConnect: true,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
    });

export { createBullMqConnection };
