import { appConfig } from "../../config/env.js";

const getDefaultJobOptions = () =>
    Object.freeze({
        attempts: appConfig.jobs.attempts,
        backoff: {
            type: "exponential",
            delay: appConfig.jobs.backoffMs,
        },
        removeOnComplete: {
            age: 24 * 60 * 60,
            count: 1000,
        },
        removeOnFail: {
            age: 7 * 24 * 60 * 60,
            count: 5000,
        },
    });

export { getDefaultJobOptions };
