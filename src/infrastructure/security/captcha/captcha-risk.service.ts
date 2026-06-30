// @ts-nocheck
import crypto from "node:crypto";

import { appConfig } from "../../../config/env.js";
import { redisService } from "../../redis/redis.service.js";

const hashIdentifier = (value: string): string =>
    crypto.createHash("sha256").update(value).digest("hex");

class CaptchaRiskService {
    #key(scope: string, identifier: string): string {
        return `captcha:${scope}:${hashIdentifier(identifier)}`;
    }

    async shouldRequireCaptcha(scope: string, identifier: string) {
        if (!appConfig.captcha.enabled || !appConfig.captcha.smartMode) {
            return {
                captchaRequired: false,
                captchaProvider: appConfig.captcha.provider,
                siteKey: appConfig.captcha.turnstileSiteKey,
            };
        }

        const client = redisService!.getClient();
        if (!client) {
            return {
                captchaRequired: false,
                captchaProvider: appConfig.captcha.provider,
                siteKey: appConfig.captcha.turnstileSiteKey,
            };
        }

        const [failures, trusted] = await Promise.all([
            client.get(this.#key(`${scope}:failures`, identifier)),
            client.get(this.#key(`${scope}:trust`, identifier)),
        ]);

        return {
            captchaRequired:
                !trusted &&
                Number(failures || 0) >= appConfig.captcha.failureThreshold,
            captchaProvider: appConfig.captcha.provider,
            siteKey: appConfig.captcha.turnstileSiteKey,
        };
    }

    async recordFailure(scope: string, identifier: string) {
        const client = redisService!.getClient();
        if (!client) return;

        const key = this.#key(`${scope}:failures`, identifier);
        await client
            .multi()
            .incr(key)
            .expire(key, appConfig.captcha.trustTtlSeconds)
            .exec();
    }

    async trust(scope: string, identifier: string) {
        const client = redisService!.getClient();
        if (!client) return;

        await client.set(
            this.#key(`${scope}:trust`, identifier),
            "1",
            "EX",
            appConfig.captcha.trustTtlSeconds
        );
    }

    async clear(scope: string, identifier: string) {
        const client = redisService!.getClient();
        if (!client) return;

        await client.del(this.#key(`${scope}:failures`, identifier));
    }
}

export { CaptchaRiskService, hashIdentifier };
