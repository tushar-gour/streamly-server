// @ts-nocheck
import Redis from "ioredis";

import { appConfig } from "../../config/env.js";
import { createLogger, serializeError } from "../logger/logger.js";

const redisLogger = createLogger("redis");

class RedisService {
    static #instance = null;
    #client = null;
    #isConnected = false;

    constructor() {
        if (RedisService.#instance) {
            return RedisService.#instance;
        }

        RedisService.#instance = this;
    }

    static getInstance() {
        if (!RedisService.#instance) {
            RedisService.#instance = new RedisService();
        }

        return RedisService.#instance;
    }

    async connect() {
        if (!appConfig.redis.enabled) {
            redisLogger.info("redis disabled by configuration");
            return null;
        }

        if (this.#isConnected) {
            redisLogger.debug("using existing redis connection");
            return this.#client;
        }

        try {
            redisLogger.info("connecting to redis");
            this.#client = new Redis(appConfig.redis.url, {
                lazyConnect: true,
                maxRetriesPerRequest: 1,
                enableReadyCheck: true,
            });

            this.#client.on("error", () => {});

            await this.#client.connect();
            await this.ping();
            this.#isConnected = true;
            redisLogger.info("redis connected");
            return this.#client;
        } catch (error) {
            this.#isConnected = false;
            this.#client?.disconnect();
            this.#client = null;
            redisLogger.error(
                { error: serializeError(error, true) },
                "redis connection failed"
            );
            throw error;
        }
    }

    async disconnect() {
        if (!this.#client || !this.#isConnected) {
            redisLogger.debug("redis already disconnected");
            return;
        }

        try {
            await this.#client.quit();
            this.#isConnected = false;
            this.#client = null;
            redisLogger.info("redis disconnected");
        } catch (error) {
            this.#client?.disconnect();
            this.#isConnected = false;
            this.#client = null;
            redisLogger.error(
                { error: serializeError(error, true) },
                "redis disconnection failed"
            );
            throw error;
        }
    }

    async ping() {
        if (!appConfig.redis.enabled) {
            return {
                connected: false,
                state: "disabled",
            };
        }

        if (!this.#client) {
            return {
                connected: false,
                state: "disconnected",
            };
        }

        const result = await this.#client.ping();

        return {
            connected: result === "PONG",
            state: result === "PONG" ? "connected" : "unhealthy",
        };
    }

    getStatus() {
        if (!appConfig.redis.enabled) {
            return {
                connected: false,
                state: "disabled",
            };
        }

        return {
            connected: this.#isConnected,
            state: this.#isConnected ? "connected" : "disconnected",
        };
    }

    getClient() {
        return this.#client;
    }

    isConnected() {
        return this.#isConnected;
    }
}

const redisService = RedisService.getInstance();

export { RedisService, redisService };
