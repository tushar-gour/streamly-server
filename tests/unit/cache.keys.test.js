import { describe, expect, it } from "vitest";

import { CacheKeys } from "../../src/infrastructure/cache/cache.keys.js";

describe("CacheKeys", () => {
    it("creates stable video list keys independent of query key order", () => {
        const firstKey = CacheKeys.videoList({
            page: 1,
            limit: 10,
            sortBy: "createdAt",
        });
        const secondKey = CacheKeys.videoList({
            sortBy: "createdAt",
            limit: 10,
            page: 1,
        });

        expect(firstKey).toBe(secondKey);
        expect(firstKey).toMatch(/^streamly:videos:list:/);
    });

    it("creates namespaced invalidation patterns", () => {
        expect(CacheKeys.videoListPattern()).toBe("streamly:videos:list:*");
        expect(CacheKeys.videoDetailPattern("video_1")).toBe(
            "streamly:video:detail:video_1"
        );
        expect(CacheKeys.videoCommentsPattern("video_1")).toBe(
            "streamly:comments:video_1:*"
        );
    });
});
