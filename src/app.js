import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

import { ApiError } from "./utils/ApiError.js";
import { ApiResponse } from "./utils/ApiResponse.js";
import { HttpStatus } from "./constants.js";

import healthcheckRouter from "./routes/healthcheck.routes.js";
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";

class Application {
    constructor() {
        this.app = express();
        this.#configureMiddleware();
        this.#configureRoutes();
        this.#configureErrorHandling();
    }

    #configureMiddleware() {
        this.app.use(
            helmet({
                crossOriginResourcePolicy: { policy: "cross-origin" },
            })
        );

        this.app.use(
            cors({
                origin: this.#getCorsOrigins(),
                credentials: true,
                methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                allowedHeaders: [
                    "Content-Type",
                    "Authorization",
                    "X-Requested-With",
                    "X-Refresh-Token",
                ],
            })
        );

        this.app.use(express.json({ limit: "16kb" }));
        this.app.use(express.urlencoded({ extended: true, limit: "16kb" }));
        this.app.use(cookieParser());

        this.app.use(compression());

        this.app.use(express.static("public"));

        if (process.env.NODE_ENV !== "production") {
            this.app.use(morgan("dev"));
        } else {
            this.app.use(morgan("combined"));
        }

        this.app.use((req, res, next) => {
            req.requestTime = new Date().toISOString();
            next();
        });
    }

    #getCorsOrigins() {
        const origin = process.env.CORS_ORIGIN;

        if (!origin) {
            return "*";
        }

        if (origin.includes(",")) {
            return origin.split(",").map((o) => o.trim());
        }

        return origin;
    }

    #configureRoutes() {
        const API_PREFIX = "/api/v1";

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
                        version: process.env.npm_package_version || "1.0.0",
                        environment: process.env.NODE_ENV || "development",
                        documentation: "/api/v1/docs",
                    },
                    "Welcome to YouTube Clone API"
                )
            );
        });

        this.app.get(`${API_PREFIX}/docs`, (_, res) => {
            res.status(200).json(
                ApiResponse.success(
                    {
                        message: "API Documentation",
                        endpoints: {
                            healthcheck: `${API_PREFIX}/healthcheck`,
                            users: `${API_PREFIX}/users`,
                            videos: `${API_PREFIX}/videos`,
                            comments: `${API_PREFIX}/comments`,
                            likes: `${API_PREFIX}/likes`,
                            playlists: `${API_PREFIX}/playlists`,
                            subscriptions: `${API_PREFIX}/subscriptions`,
                            dashboard: `${API_PREFIX}/dashboard`,
                        },
                    },
                    "API documentation"
                )
            );
        });
    }

    #configureErrorHandling() {
        this.app.use((req, res, next) => {
            const error = new ApiError(
                HttpStatus.NOT_FOUND,
                `Route ${req.method} ${req.originalUrl} not found`
            );
            next(error);
        });

        this.app.use((err, req, res, next) => {
            if (err instanceof ApiError) {
                return res.status(err.statusCode).json(err.toJSON());
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

            console.error("Unhandled Error:", err);

            const message =
                process.env.NODE_ENV === "production"
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
