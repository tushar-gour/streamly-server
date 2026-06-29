import pino from "pino";

import { appConfig, isProduction } from "../../config/env.js";
import { redactValue, serializeError } from "./redaction.js";

const redactPaths = [
    "*.password",
    "*.oldPassword",
    "*.newPassword",
    "*.confirmPassword",
    "*.accessToken",
    "*.refreshToken",
    "*.token",
    "*.tokenHash",
    "*.refreshTokenHash",
    "*.authorization",
    "*.Authorization",
    "*.cookie",
    "*.Cookie",
    "*.apiKey",
    "*.apiSecret",
    "*.databaseUrl",
    "*.redisUrl",
    "req.headers.authorization",
    "req.headers.cookie",
    "headers.authorization",
    "headers.cookie",
];

const logger = pino({
    level: appConfig.logger.level,
    base: {
        service: "streamly-api",
        environment: appConfig.nodeEnv,
        logFormat: appConfig.logger.format,
    },
    messageKey: "message",
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level(label) {
            return { level: label };
        },
    },
    redact: {
        paths: redactPaths,
        censor: "[REDACTED]",
    },
});

const createLogger = (context) => logger.child({ context });

const logError = (activeLogger, error, metadata = {}, message = "error") => {
    const targetLogger = activeLogger || logger;

    targetLogger.error(
        {
            ...redactValue(metadata),
            error: serializeError(error, !isProduction()),
        },
        message
    );
};

export { createLogger, logError, logger, redactValue, serializeError };
