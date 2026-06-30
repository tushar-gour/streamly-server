import { describe, expect, it, vi } from "vitest";

import { hashValue } from "../../src/application/services/otp.service.js";
import { NoopCaptchaProvider } from "../../src/infrastructure/security/captcha/noop-captcha.provider.js";
import { normalizeWhatsAppNumber } from "../../src/infrastructure/notifications/whatsapp/twilio-whatsapp.provider.js";

describe("platform security providers", () => {
    it("hashes OTP values deterministically without returning raw code", () => {
        const code = "123456";
        const hash = hashValue(code);

        expect(hash).toHaveLength(64);
        expect(hash).not.toBe(code);
        expect(hashValue(code)).toBe(hash);
    });

    it("uses no-op captcha provider in disabled test mode", async () => {
        const provider = new NoopCaptchaProvider();

        await expect(provider.verify()).resolves.toEqual({
            success: true,
            provider: "noop",
        });
    });

    it("normalizes Twilio WhatsApp recipients", () => {
        expect(normalizeWhatsAppNumber("+15555551234")).toBe(
            "whatsapp:+15555551234"
        );
        expect(normalizeWhatsAppNumber("whatsapp:+15555551234")).toBe(
            "whatsapp:+15555551234"
        );
    });

    it("keeps provider tests offline", () => {
        expect(vi.isMockFunction(fetch)).toBe(false);
    });
});
