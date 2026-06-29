// @ts-nocheck
import { describe, expect, it, vi } from "vitest";

import { PolicyService } from "../../src/application/services/policy.service.js";

describe("PolicyService", () => {
    it("allows video owner updates", async () => {
        const service = new PolicyService({
            videoRepository: {
                findById: vi.fn().mockResolvedValue({ owner: "user_1" }),
            },
            commentRepository: {},
            playlistRepository: {},
        });

        await expect(
            service.canUpdateVideo({
                userId: "user_1",
                params: { videoId: "video_1" },
            })
        ).resolves.toBe(true);
    });

    it("rejects non-owner playlist management", async () => {
        const service = new PolicyService({
            videoRepository: {},
            commentRepository: {},
            playlistRepository: {
                findById: vi.fn().mockResolvedValue({ owner: "owner_1" }),
            },
        });

        await expect(
            service.canManagePlaylistVideos({
                userId: "user_1",
                params: { playlistId: "playlist_1" },
            })
        ).resolves.toBe(false);
    });
});
