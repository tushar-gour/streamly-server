import dotenv from "dotenv";
import http from "http";

import connectDB, { databaseConnection } from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: "./.env",
});

class Server {
    constructor(app) {
        this.app = app;
        this.server = null;
        this.port = this.#normalizePort(process.env.PORT || "8000");
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
        const divider = "═".repeat(60);
        const env = process.env.NODE_ENV || "development";

        console.log(`\n${divider}`);
        console.log("  🚀 YouTube Clone API Server");
        console.log(divider);
        console.log(`  📍 Environment: ${env}`);
        console.log(`  🌐 Port: ${this.port}`);
        console.log(`  🔗 URL: http://localhost:${this.port}`);
        console.log(`  📚 API Docs: http://localhost:${this.port}/api/v1/docs`);
        console.log(
            `  ❤️  Health: http://localhost:${this.port}/api/v1/healthcheck`
        );
        console.log(`${divider}\n`);
    }

    #setupGracefulShutdown() {
        const shutdown = async (signal) => {
            if (this.isShuttingDown) {
                return;
            }

            this.isShuttingDown = true;
            console.log(
                `\n⚠️  Received ${signal}. Gracefully shutting down...`
            );

            this.server.close(async () => {
                console.log("✅ HTTP server closed");

                try {
                    await databaseConnection.disconnect();
                    console.log("✅ Database connection closed");

                    console.log("👋 Server shutdown complete");
                    process.exit(0);
                } catch (error) {
                    console.error("❌ Error during shutdown:", error);
                    process.exit(1);
                }
            });

            setTimeout(() => {
                console.error("❌ Forced shutdown due to timeout");
                process.exit(1);
            }, 30000);
        };

        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));

        process.on("uncaughtException", (error) => {
            console.error("❌ Uncaught Exception:", error);
            shutdown("uncaughtException");
        });

        process.on("unhandledRejection", (reason, promise) => {
            console.error(
                "❌ Unhandled Rejection at:",
                promise,
                "reason:",
                reason
            );
            shutdown("unhandledRejection");
        });
    }

    async start() {
        try {
            console.log("🔌 Connecting to database...");
            await connectDB();

            this.server = http.createServer(this.app);

            this.#setupGracefulShutdown();

            this.server.listen(this.port, () => {
                this.#logServerInfo();
            });

            this.server.on("error", (error) => {
                if (error.code === "EADDRINUSE") {
                    console.error(`❌ Port ${this.port} is already in use`);
                } else if (error.code === "EACCES") {
                    console.error(
                        `❌ Port ${this.port} requires elevated privileges`
                    );
                } else {
                    console.error("❌ Server error:", error);
                }
                process.exit(1);
            });
        } catch (error) {
            console.error("❌ Failed to start server:", error);
            process.exit(1);
        }
    }
}

const server = new Server(app);
server.start();
