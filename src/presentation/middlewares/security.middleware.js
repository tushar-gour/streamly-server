import rateLimit from "express-rate-limit";

import { appConfig, isProduction } from "../../config/env.js";
import { HttpStatus } from "../../shared/constants/index.js";
import { ApiError } from "../../shared/errors/api-error.js";

const dangerousKeys = new Set(["__proto__", "constructor", "prototype"]);

const sanitizeValue = (value) => {
    if (typeof value === "string") {
        return value.replace(/\0/g, "");
    }

    if (Array.isArray(value)) {
        return value.map((entry) => sanitizeValue(entry));
    }

    if (!value || typeof value !== "object") {
        return value;
    }

    for (const key of Object.keys(value)) {
        if (dangerousKeys.has(key)) {
            delete value[key];
            continue;
        }

        value[key] = sanitizeValue(value[key]);
    }

    return value;
};

const sanitizeRequest = (req, res, next) => {
    sanitizeValue(req.body);
    sanitizeValue(req.params);
    sanitizeValue(req.query);
    next();
};

const createRateLimitHandler = (message) => (req, res, next) => {
    next(new ApiError(HttpStatus.TOO_MANY_REQUESTS, message));
};

const globalApiRateLimiter = rateLimit({
    windowMs: appConfig.security.rateLimitWindowMs,
    limit: appConfig.security.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) =>
        appConfig.test.disableRateLimiting ||
        req.path.startsWith("/healthcheck"),
    handler: createRateLimitHandler("Too many requests. Try again later."),
});

const authRateLimiter = rateLimit({
    windowMs: appConfig.security.authRateLimitWindowMs,
    limit: appConfig.security.authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => appConfig.test.disableRateLimiting,
    handler: createRateLimitHandler(
        "Too many authentication attempts. Try again later."
    ),
});

const getHelmetOptions = () => ({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "no-referrer" },
    frameguard: { action: "deny" },
    hsts: isProduction()
        ? {
              maxAge: 15552000,
              includeSubDomains: true,
              preload: false,
          }
        : false,
});

export {
    authRateLimiter,
    getHelmetOptions,
    globalApiRateLimiter,
    sanitizeRequest,
};
