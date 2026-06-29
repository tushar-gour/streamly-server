// @ts-nocheck
import { appConfig } from "../../config/env.js";
import { createLogger, serializeError } from "../logger/logger.js";

const cacheLogger = createLogger("cache-service");

class CacheService {
    constructor({ redisService }) {
        this.redisService = redisService;
    }

    async get(key) {
        const client = this.#getClient();
        if (!client) return null;

        try {
            const cachedValue = await client.get(key);
            if (!cachedValue) {
                cacheLogger.debug({ key }, "cache miss");
                return null;
            }

            cacheLogger.debug({ key }, "cache hit");
            return JSON.parse(cachedValue);
        } catch (error) {
            this.#logCacheFailure(error, "cache get failed", key);
            return null;
        }
    }

    async set(key, value, ttlSeconds = appConfig.cache.defaultTtlSeconds) {
        const client = this.#getClient();
        if (!client) return;

        try {
            await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
            cacheLogger.debug({ key, ttlSeconds }, "cache set");
        } catch (error) {
            this.#logCacheFailure(error, "cache set failed", key);
        }
    }

    async del(key) {
        const client = this.#getClient();
        if (!client) return 0;

        try {
            return await client.del(key);
        } catch (error) {
            this.#logCacheFailure(error, "cache delete failed", key);
            return 0;
        }
    }

    async deleteByPattern(pattern) {
        const client = this.#getClient();
        if (!client || !pattern.startsWith("streamly:")) return 0;

        let cursor = "0";
        let deletedCount = 0;

        try {
            do {
                const [nextCursor, keys] = await client.scan(
                    cursor,
                    "MATCH",
                    pattern,
                    "COUNT",
                    100
                );
                cursor = nextCursor;

                if (keys.length > 0) {
                    deletedCount += await client.del(...keys);
                }
            } while (cursor !== "0");

            cacheLogger.debug(
                { pattern, deletedCount },
                "cache pattern deleted"
            );
            return deletedCount;
        } catch (error) {
            this.#logCacheFailure(
                error,
                "cache pattern delete failed",
                pattern
            );
            return deletedCount;
        }
    }

    async remember(key, ttlSeconds, loader) {
        const cachedValue = await this.get(key);
        if (cachedValue !== null) {
            return cachedValue;
        }

        const freshValue = await loader();
        await this.set(key, freshValue, ttlSeconds);
        return freshValue;
    }

    isEnabled() {
        return appConfig.cache.enabled && this.redisService.isConnected();
    }

    #getClient() {
        if (!this.isEnabled()) {
            return null;
        }

        return this.redisService.getClient();
    }

    #logCacheFailure(error, message, key) {
        cacheLogger.warn(
            {
                key,
                error: serializeError(error),
            },
            message
        );
    }
}

export { CacheService };
