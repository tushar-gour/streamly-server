import mongoose from "mongoose";

import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { cloudinaryService } from "../utils/cloudinary.js";

class HealthcheckController {
    static healthcheck = asyncHandler(async (_, res) => {
        const healthInfo = {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || "development",
        };

        return res.status(200).json(ApiResponse.success(healthInfo, "OK"));
    });

    static detailedHealthcheck = asyncHandler(async (_, res) => {
        const dbState = mongoose.connection.readyState;
        const dbStatus = {
            connected: dbState === 1,
            state: HealthcheckController.#getDbStateName(dbState),
        };

        let cloudinaryStatus;
        try {
            const cloudinaryHealth = await cloudinaryService.healthCheck();
            cloudinaryStatus = {
                connected: cloudinaryHealth.status === "healthy",
                ...cloudinaryHealth,
            };
        } catch (error) {
            cloudinaryStatus = {
                connected: false,
                status: "unhealthy",
                error: error.message,
            };
        }

        const memoryUsage = process.memoryUsage();
        const formatBytes = (bytes) => (bytes / 1024 / 1024).toFixed(2) + " MB";

        const healthInfo = {
            status: dbStatus.connected ? "healthy" : "degraded",
            timestamp: new Date().toISOString(),
            uptime: {
                seconds: Math.floor(process.uptime()),
                formatted: HealthcheckController.#formatUptime(
                    process.uptime()
                ),
            },
            environment: process.env.NODE_ENV || "development",
            version: process.env.npm_package_version || "1.0.0",
            services: {
                database: dbStatus,
                cloudinary: cloudinaryStatus,
            },
            memory: {
                heapUsed: formatBytes(memoryUsage.heapUsed),
                heapTotal: formatBytes(memoryUsage.heapTotal),
                rss: formatBytes(memoryUsage.rss),
                external: formatBytes(memoryUsage.external),
            },
            node: {
                version: process.version,
                platform: process.platform,
                arch: process.arch,
            },
        };

        const statusCode = healthInfo.status === "healthy" ? 200 : 503;
        return res
            .status(statusCode)
            .json(ApiResponse.success(healthInfo, healthInfo.status));
    });

    static #getDbStateName(state) {
        const states = {
            0: "disconnected",
            1: "connected",
            2: "connecting",
            3: "disconnecting",
        };
        return states[state] || "unknown";
    }

    static #formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        parts.push(`${secs}s`);

        return parts.join(" ");
    }
}

export const healthcheck = HealthcheckController.healthcheck;
export const detailedHealthcheck = HealthcheckController.detailedHealthcheck;

export { HealthcheckController };
