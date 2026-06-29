// @ts-nocheck
import { describe, expect, it, vi } from "vitest";

import { CacheService } from "../../src/infrastructure/cache/cache.service.js";

const createRedisService = (client, connected = true) => ({
    isConnected: vi.fn(() => connected),
    getClient: vi.fn(() => client),
});

describe("CacheService", () => {
    it("returns null when Redis is unavailable", async () => {
        const service = new CacheService({
            redisService: createRedisService(null, false),
        });

        await expect(service.get("streamly:test")).resolves.toBeNull();
    });

    it("loads fresh value and caches it on miss", async () => {
        const client = {
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue("OK"),
        };
        const service = new CacheService({
            redisService: createRedisService(client),
        });
        const loader = vi.fn().mockResolvedValue({ ok: true });

        const result = await service.remember("streamly:test", 60, loader);

        expect(result).toEqual({ ok: true });
        expect(loader).toHaveBeenCalledTimes(1);
        expect(client.set).toHaveBeenCalledWith(
            "streamly:test",
            JSON.stringify({ ok: true }),
            "EX",
            60
        );
    });

    it("fails open when Redis get throws", async () => {
        const service = new CacheService({
            redisService: createRedisService({
                get: vi.fn().mockRejectedValue(new Error("redis down")),
            }),
        });

        await expect(service.get("streamly:test")).resolves.toBeNull();
    });
});
