import { beforeEach, describe, expect, it, vi } from "vitest";

describe("notification providers", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it("uses no-op email provider when email delivery is disabled", async () => {
        process.env.EMAIL_ENABLED = "false";
        process.env.EMAIL_PROVIDER = "noop";

        const { createEmailProvider } = await import(
            "../../src/infrastructure/notifications/email/email-provider.factory.js"
        );

        const provider = createEmailProvider();
        const result = await provider.sendEmailVerification({
            userId: "user-1",
            email: "user@example.com",
            username: "streamer",
            token: "verification-token",
        });

        expect(result).toEqual({
            delivered: false,
            provider: "noop",
        });
    });

    it("builds SendGrid email payload without real network calls", async () => {
        const setApiKey = vi.fn();
        const send = vi.fn(async () => [{ statusCode: 202 }]);

        vi.doMock("@sendgrid/mail", () => ({
            default: { setApiKey, send },
        }));

        process.env.EMAIL_ENABLED = "true";
        process.env.EMAIL_PROVIDER = "sendgrid";
        process.env.SENDGRID_API_KEY = "test-sendgrid-api-key";
        process.env.SENDGRID_FROM_EMAIL = "no-reply@example.com";
        process.env.SENDGRID_FROM_NAME = "Streamly";
        process.env.APP_PUBLIC_BASE_URL = "https://streamly.zytheran.me";

        const { SendGridEmailProvider } = await import(
            "../../src/infrastructure/notifications/email/sendgrid-email.provider.js"
        );

        const provider = new SendGridEmailProvider();
        const result = await provider.sendEmailVerification({
            userId: "user-1",
            email: "user@example.com",
            username: "streamer",
            token: "verification-token",
            expiresAt: "2026-07-01T00:00:00.000Z",
        });

        expect(result.delivered).toBe(true);
        expect(setApiKey).toHaveBeenCalledWith("test-sendgrid-api-key");
        expect(send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "user@example.com",
                from: {
                    email: "no-reply@example.com",
                    name: "Streamly",
                },
                subject: "Verify your Streamly email address",
                html: expect.stringContaining(
                    "https://streamly.zytheran.me/api/v1/users/verify-email"
                ),
            })
        );
    });

    it("uses no-op SMS provider when SMS delivery is disabled", async () => {
        process.env.SMS_ENABLED = "false";
        process.env.SMS_PROVIDER = "noop";

        const { createSmsProvider } = await import(
            "../../src/infrastructure/notifications/sms/sms-provider.factory.js"
        );

        const provider = createSmsProvider();
        const result = await provider.sendSms({
            to: "+15555551234",
            message: "Security notice",
        });

        expect(result).toEqual({
            delivered: false,
            provider: "noop",
        });
    });

    it("builds Twilio SMS payload without real network calls", async () => {
        const create = vi.fn(async () => ({ sid: "SM123" }));
        const twilioClient = vi.fn(() => ({ messages: { create } }));

        vi.doMock("twilio", () => ({
            default: twilioClient,
        }));

        process.env.SMS_ENABLED = "true";
        process.env.SMS_PROVIDER = "twilio";
        process.env.TWILIO_ACCOUNT_SID = "AC123";
        process.env.TWILIO_AUTH_TOKEN = "twilio-auth-token";
        process.env.TWILIO_PHONE_NUMBER = "+15555550000";

        const { TwilioSmsProvider, maskPhoneNumber } = await import(
            "../../src/infrastructure/notifications/sms/twilio-sms.provider.js"
        );

        const provider = new TwilioSmsProvider();
        const result = await provider.sendSms({
            to: "+15555551234",
            message: "Security notice",
            userId: "user-1",
        });

        expect(result).toEqual({
            delivered: true,
            provider: "twilio",
            sid: "SM123",
        });
        expect(twilioClient).toHaveBeenCalledWith("AC123", "twilio-auth-token");
        expect(create).toHaveBeenCalledWith({
            to: "+15555551234",
            body: "Security notice",
            from: "+15555550000",
        });
        expect(maskPhoneNumber("+15555551234")).toBe("+*******1234");
    });
});
