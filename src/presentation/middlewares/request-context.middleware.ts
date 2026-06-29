// @ts-nocheck
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

import { appConfig } from "../../config/env.js";
import { createLogger } from "../../infrastructure/logger/logger.js";

const requestContextStorage = new AsyncLocalStorage();
const requestLogger = createLogger("http");

const getHeaderValue = (value) => {
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
};

const requestContextMiddleware = (req, res, next) => {
    const requestId =
        getHeaderValue(req.header(appConfig.logger.requestIdHeader)) ||
        randomUUID();
    const correlationId =
        getHeaderValue(req.header(appConfig.logger.correlationIdHeader)) ||
        requestId;

    const context = {
        requestId,
        correlationId,
    };

    req.requestId = requestId;
    req.correlationId = correlationId;
    req.requestTime = new Date().toISOString();
    req.log = requestLogger.child(context);

    res.setHeader(appConfig.logger.requestIdHeader, requestId);
    res.setHeader(appConfig.logger.correlationIdHeader, correlationId);

    requestContextStorage.run(context, next);
};

const getRequestContext = () => requestContextStorage.getStore() || {};

export { getRequestContext, requestContextMiddleware };
