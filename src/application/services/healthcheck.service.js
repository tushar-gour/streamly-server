import { appConfig } from "../../config/env.js";

class HealthcheckService {
    constructor({ cloudinaryService, databaseHealthService, redisService }) {
        this.cloudinaryService = cloudinaryService;
        this.databaseHealthService = databaseHealthService;
        this.redisService = redisService;
    }

    getBasicHealth() {
        return {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: appConfig.nodeEnv,
        };
    }

    async getDetailedHealth() {
        const dbStatus = this.databaseHealthService.getStatus();
        const redisStatus = await this.#getRedisStatus();

        let cloudinaryStatus;
        try {
            const cloudinaryHealth = await this.cloudinaryService.healthCheck();
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
        const healthInfo = {
            status:
                dbStatus.connected &&
                (redisStatus.connected || !appConfig.redis.enabled)
                    ? "healthy"
                    : "degraded",
            timestamp: new Date().toISOString(),
            uptime: {
                seconds: Math.floor(process.uptime()),
                formatted: this.#formatUptime(process.uptime()),
            },
            environment: appConfig.nodeEnv,
            version: appConfig.packageVersion,
            services: {
                database: dbStatus,
                redis: redisStatus,
                cloudinary: cloudinaryStatus,
            },
            memory: {
                heapUsed: this.#formatBytes(memoryUsage.heapUsed),
                heapTotal: this.#formatBytes(memoryUsage.heapTotal),
                rss: this.#formatBytes(memoryUsage.rss),
                external: this.#formatBytes(memoryUsage.external),
            },
            node: {
                version: process.version,
                platform: process.platform,
                arch: process.arch,
            },
        };

        return {
            statusCode: healthInfo.status === "healthy" ? 200 : 503,
            data: healthInfo,
            message: healthInfo.status,
        };
    }

    async #getRedisStatus() {
        try {
            return await this.redisService.ping();
        } catch (error) {
            return {
                connected: false,
                state: "unhealthy",
                error: error.message,
            };
        }
    }

    #formatUptime(seconds) {
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

    #formatBytes(bytes) {
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }
}

export { HealthcheckService };
