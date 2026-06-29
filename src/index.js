import http from "http";

import {
    appConfig,
    assertStartupConfig,
    StartupConfigError,
} from "./config/env.js";
import connectDB, {
    databaseConnection,
} from "./infrastructure/database/prisma-connection.js";
import { redisService } from "./infrastructure/redis/redis.service.js";
import { queueRegistry } from "./infrastructure/jobs/queue-registry.js";
import {
    createLogger,
    serializeError,
} from "./infrastructure/logger/logger.js";

const serverLogger = createLogger("server");

class Server {
    constructor(app) {
        this.app = app;
        this.server = null;
        this.port = this.#normalizePort(appConfig.port);
        this.isShuttingDown = false;
    }

    #normalizePort(val) {
        const port = parseInt(val, 10);
        if (isNaN(port) || port < 0) {
            return 8000;
        }
        return port;
    }

    #logServerInfo() {
        serverLogger.info(
            {
                port: this.port,
                healthPath: "/api/v1/healthcheck",
            },
            "server started"
        );
    }

    #setupGracefulShutdown() {
        const shutdown = async (signal) => {
            if (this.isShuttingDown) {
                return;
            }

            this.isShuttingDown = true;
            serverLogger.info({ signal }, "graceful shutdown started");

            this.server.close(async () => {
                serverLogger.info("http server closed");

                try {
                    await databaseConnection.disconnect();

                    await queueRegistry.closeAll();

                    await redisService.disconnect();

                    serverLogger.info("server shutdown complete");
                    process.exit(0);
                } catch (error) {
                    serverLogger.error(
                        { error: serializeError(error, true) },
                        "shutdown failed"
                    );
                    process.exit(1);
                }
            });

            setTimeout(() => {
                serverLogger.error("forced shutdown due to timeout");
                process.exit(1);
            }, 30000);
        };

        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));

        process.on("uncaughtException", (error) => {
            serverLogger.fatal(
                { error: serializeError(error, true) },
                "uncaught exception"
            );
            shutdown("uncaughtException");
        });

        process.on("unhandledRejection", (reason) => {
            serverLogger.fatal(
                { reason: serializeError(reason, true) || String(reason) },
                "unhandled rejection"
            );
            shutdown("unhandledRejection");
        });
    }

    async start() {
        try {
            serverLogger.info("connecting to database");
            await connectDB();

            serverLogger.info("connecting to redis");
            await redisService.connect();

            this.server = http.createServer(this.app);

            this.#setupGracefulShutdown();

            this.server.listen(this.port, () => {
                this.#logServerInfo();
            });

            this.server.on("error", (error) => {
                if (error.code === "EADDRINUSE") {
                    serverLogger.error(
                        { port: this.port },
                        "server port already in use"
                    );
                } else if (error.code === "EACCES") {
                    serverLogger.error(
                        { port: this.port },
                        "server port requires elevated privileges"
                    );
                } else {
                    serverLogger.error(
                        { error: serializeError(error, true) },
                        "server error"
                    );
                }
                process.exit(1);
            });
        } catch (error) {
            if (error instanceof StartupConfigError) {
                serverLogger.error(
                    { missingKeys: error.missingKeys },
                    "startup configuration error"
                );
            } else {
                serverLogger.error(
                    { error: serializeError(error, true) },
                    "failed to start server"
                );
            }
            process.exit(1);
        }
    }
}

const bootstrap = async () => {
    try {
        assertStartupConfig();
        const { app } = await import("./app.js");
        const server = new Server(app);
        await server.start();
    } catch (error) {
        if (error instanceof StartupConfigError) {
            serverLogger.error(
                { missingKeys: error.missingKeys },
                "startup configuration error"
            );
        } else {
            serverLogger.error(
                { error: serializeError(error, true) },
                "failed to bootstrap server"
            );
        }
        process.exit(1);
    }
};

bootstrap();
