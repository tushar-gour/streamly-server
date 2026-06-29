import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import swaggerUi from "swagger-ui-express";

import { ApiError } from "./shared/errors/api-error.js";
import { ApiResponse } from "./shared/responses/api-response.js";
import { HttpStatus } from "./shared/constants/index.js";
import { appConfig, isProduction } from "./config/env.js";
import { openApiDocument } from "./docs/openapi/openapi-document.js";
import { logError } from "./infrastructure/logger/logger.js";
import { httpLoggerMiddleware } from "./presentation/middlewares/http-logger.middleware.js";
import { requestContextMiddleware } from "./presentation/middlewares/request-context.middleware.js";
import {
    getHelmetOptions,
    globalApiRateLimiter,
    sanitizeRequest,
} from "./presentation/middlewares/security.middleware.js";

import healthcheckRouter from "./presentation/routes/healthcheck.routes.js";
import userRouter from "./presentation/routes/user.routes.js";
import videoRouter from "./presentation/routes/video.routes.js";
import commentRouter from "./presentation/routes/comment.routes.js";
import dashboardRouter from "./presentation/routes/dashboard.routes.js";
import likeRouter from "./presentation/routes/like.routes.js";
import playlistRouter from "./presentation/routes/playlist.routes.js";
import subscriptionRouter from "./presentation/routes/subscription.routes.js";

class Application {
    constructor() {
        this.app = express();
        this.#configureMiddleware();
        this.#configureRoutes();
        this.#configureErrorHandling();
    }

    #configureMiddleware() {
        this.app.set("trust proxy", appConfig.security.trustProxy);

        this.app.use(requestContextMiddleware);

        this.app.use(helmet(getHelmetOptions()));

        this.app.use(
            cors({
                origin: this.#validateCorsOrigin.bind(this),
                credentials: appConfig.security.corsCredentials,
                methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                allowedHeaders: [
                    "Content-Type",
                    "Authorization",
                    "X-Requested-With",
                    "X-Refresh-Token",
                ],
            })
        );

        this.app.use(express.json({ limit: appConfig.security.jsonBodyLimit }));
        this.app.use(
            express.urlencoded({
                extended: true,
                limit: appConfig.security.urlencodedBodyLimit,
            })
        );
        this.app.use(cookieParser());
        this.app.use(sanitizeRequest);

        this.app.use(compression());

        this.app.use(express.static("public"));

        this.app.use(httpLoggerMiddleware);
    }

    #getCorsOrigins() {
        const origin = appConfig.corsOrigin;

        if (!origin) {
            return "*";
        }

        if (origin.includes(",")) {
            return origin.split(",").map((o) => o.trim());
        }

        return origin;
    }

    #validateCorsOrigin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        const allowedOrigins = this.#getCorsOrigins();

        if (allowedOrigins === "*") {
            return callback(
                null,
                appConfig.security.corsCredentials && !isProduction()
                    ? true
                    : "*"
            );
        }

        if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        if (allowedOrigins === origin) {
            return callback(null, true);
        }

        return callback(
            new ApiError(HttpStatus.FORBIDDEN, "CORS origin not allowed")
        );
    }

    #configureRoutes() {
        const API_PREFIX = "/api/v1";

        this.app.use(API_PREFIX, globalApiRateLimiter);

        this.app.use(`${API_PREFIX}/healthcheck`, healthcheckRouter);

        this.app.use(`${API_PREFIX}/users`, userRouter);
        this.app.use(`${API_PREFIX}/videos`, videoRouter);
        this.app.use(`${API_PREFIX}/comments`, commentRouter);
        this.app.use(`${API_PREFIX}/likes`, likeRouter);
        this.app.use(`${API_PREFIX}/playlists`, playlistRouter);
        this.app.use(`${API_PREFIX}/subscriptions`, subscriptionRouter);
        this.app.use(`${API_PREFIX}/dashboard`, dashboardRouter);

        this.app.get("/", (_, res) => {
            res.status(200).json(
                ApiResponse.success(
                    {
                        name: "YouTube Clone API",
                        version: appConfig.packageVersion,
                        environment: appConfig.nodeEnv,
                        documentation: appConfig.docs.route,
                    },
                    "Welcome to YouTube Clone API"
                )
            );
        });

        if (appConfig.docs.enabled) {
            this.app.get(appConfig.docs.specRoute, (_, res) => {
                res.status(200).json(openApiDocument);
            });

            this.app.use(
                appConfig.docs.route,
                swaggerUi.serve,
                swaggerUi.setup(openApiDocument, {
                    explorer: true,
                    swaggerOptions: {
                        persistAuthorization: false,
                        displayRequestDuration: true,
                    },
                    customSiteTitle: "Streamly API Docs",
                })
            );
        }
    }

    #configureErrorHandling() {
        this.app.use((req, res, next) => {
            const error = new ApiError(
                HttpStatus.NOT_FOUND,
                `Route ${req.method} ${req.originalUrl} not found`
            );
            next(error);
        });

        this.app.use((err, req, res, _next) => {
            const statusCode =
                err.statusCode ||
                (err.type === "entity.too.large"
                    ? HttpStatus.PAYLOAD_TOO_LARGE
                    : HttpStatus.INTERNAL_SERVER_ERROR);

            logError(
                req.log,
                err,
                {
                    method: req.method,
                    path: req.originalUrl,
                    statusCode,
                    userId: req.user?._id,
                },
                "request error"
            );

            if (err instanceof ApiError) {
                return res.status(err.statusCode).json(err.toJSON());
            }

            if (err.type === "entity.too.large") {
                return res
                    .status(HttpStatus.PAYLOAD_TOO_LARGE)
                    .json(
                        new ApiError(
                            HttpStatus.PAYLOAD_TOO_LARGE,
                            "Request payload too large"
                        ).toJSON()
                    );
            }

            if (
                err instanceof SyntaxError &&
                err.status === 400 &&
                "body" in err
            ) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .json(
                        new ApiError(
                            HttpStatus.BAD_REQUEST,
                            "Malformed JSON payload"
                        ).toJSON()
                    );
            }

            if (err.name === "ValidationError") {
                const messages = Object.values(err.errors).map(
                    (e) => e.message
                );
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .json(
                        new ApiError(
                            HttpStatus.BAD_REQUEST,
                            "Validation failed",
                            messages
                        ).toJSON()
                    );
            }

            if (err.name === "CastError") {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .json(
                        new ApiError(
                            HttpStatus.BAD_REQUEST,
                            `Invalid ${err.path}: ${err.value}`
                        ).toJSON()
                    );
            }

            if (err.code === 11000) {
                const field = Object.keys(err.keyValue)[0];
                return res
                    .status(HttpStatus.CONFLICT)
                    .json(
                        new ApiError(
                            HttpStatus.CONFLICT,
                            `${field} already exists`
                        ).toJSON()
                    );
            }

            if (err.name === "JsonWebTokenError") {
                return res
                    .status(HttpStatus.UNAUTHORIZED)
                    .json(
                        new ApiError(
                            HttpStatus.UNAUTHORIZED,
                            "Invalid token"
                        ).toJSON()
                    );
            }

            if (err.name === "TokenExpiredError") {
                return res
                    .status(HttpStatus.UNAUTHORIZED)
                    .json(
                        new ApiError(
                            HttpStatus.UNAUTHORIZED,
                            "Token expired"
                        ).toJSON()
                    );
            }

            if (err.code === "LIMIT_FILE_SIZE") {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .json(
                        new ApiError(
                            HttpStatus.BAD_REQUEST,
                            "File too large"
                        ).toJSON()
                    );
            }

            if (err.code === "LIMIT_UNEXPECTED_FILE") {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .json(
                        new ApiError(
                            HttpStatus.BAD_REQUEST,
                            "Unexpected file field"
                        ).toJSON()
                    );
            }

            const message = isProduction()
                ? "Internal server error"
                : err.message;

            return res
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json(
                    new ApiError(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        message
                    ).toJSON()
                );
        });
    }

    getApp() {
        return this.app;
    }
}

const application = new Application();
const app = application.getApp();

export { app, Application };
