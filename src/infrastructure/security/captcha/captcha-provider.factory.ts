import { appConfig } from "../../../config/env.js";
import { NoopCaptchaProvider } from "./noop-captcha.provider.js";
import { TurnstileProvider } from "./turnstile.provider.js";

const createCaptchaProvider = () => {
    if (
        appConfig.captcha.enabled &&
        appConfig.captcha.provider === "turnstile"
    ) {
        return new TurnstileProvider();
    }

    return new NoopCaptchaProvider();
};

export { createCaptchaProvider };
