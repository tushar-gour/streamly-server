import { assertStartupConfig, StartupConfigError } from "../config/env.js";
import {
    createLogger,
    serializeError,
} from "../infrastructure/logger/logger.js";
import { WorkerRunner } from "../infrastructure/jobs/worker-runner.js";

const workerLogger = createLogger("worker-process");
const workerRunner = new WorkerRunner();

const shutdown = async (signal) => {
    try {
        await workerRunner.shutdown(signal);
        process.exit(0);
    } catch {
        process.exit(1);
    }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (error) => {
    workerLogger.fatal(
        { error: serializeError(error, true) },
        "uncaught worker exception"
    );
    shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
    workerLogger.fatal(
        { reason: serializeError(reason, true) || String(reason) },
        "unhandled worker rejection"
    );
    shutdown("unhandledRejection");
});

try {
    assertStartupConfig();
    await workerRunner.start();
} catch (error) {
    if (error instanceof StartupConfigError) {
        workerLogger.error(
            { missingKeys: error.missingKeys },
            "worker startup configuration error"
        );
    } else {
        workerLogger.error(
            { error: serializeError(error, true) },
            "worker startup failed"
        );
    }
    process.exit(1);
}
