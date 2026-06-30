import { appConfig } from "../../../config/env.js";
import { ApiError } from "../../../shared/errors/api-error.js";
import { createLogger } from "../../logger/logger.js";

const turnstileLogger = createLogger("turnstile-captcha");
const TURNSTILE_VERIFY_URL =
    "https://challenges.cloudflare.com/turnstile/v0/siteverify";

class TurnstileProvider {
    async verify({ token, remoteIp }: { token?: string; remoteIp?: string }) {
        if (!token) {
            throw new ApiError(400, "Captcha token is required");
        }

        const body = new URLSearchParams({
            secret: appConfig.captcha.turnstileSecretKey,
            response: token,
        });

        if (remoteIp) body.set("remoteip", remoteIp);

        const response = await fetch(TURNSTILE_VERIFY_URL, {
            method: "POST",
            body,
        });
        const result = (await response.json()) as {
            success?: boolean;
            "error-codes"?: string[];
        };

        if (!result.success) {
            turnstileLogger.warn(
                { provider: "turnstile", errors: result["error-codes"] },
                "captcha verification failed"
            );
            throw new ApiError(403, "Captcha verification failed");
        }

        return {
            success: true,
            provider: "turnstile",
        };
    }
}

export { TurnstileProvider };
