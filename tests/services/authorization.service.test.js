import { describe, expect, it, vi } from "vitest";

import { AuthorizationService } from "../../src/application/services/authorization.service.js";

describe("AuthorizationService", () => {
    it("checks direct permission membership", async () => {
        const service = new AuthorizationService({
            userRoleRepository: {
                getUserPermissions: vi
                    .fn()
                    .mockResolvedValue([{ name: "video:create" }]),
            },
        });

        await expect(
            service.hasPermission("user_1", "video:create")
        ).resolves.toBe(true);
        await expect(
            service.hasPermission("user_1", "video:delete:any")
        ).resolves.toBe(false);
    });

    it("rejects missing authenticated user", () => {
        const service = new AuthorizationService({
            userRoleRepository: {
                getUserPermissions: vi.fn(),
            },
        });

        expect(() => service.ensureAuthenticated(null)).toThrow(
            "Authentication required"
        );
    });
});
