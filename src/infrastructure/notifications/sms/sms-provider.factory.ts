import { appConfig } from "../../../config/env.js";
import { NoopSmsProvider } from "./noop-sms.provider.js";
import { TwilioSmsProvider } from "./twilio-sms.provider.js";

const createSmsProvider = () => {
    if (appConfig.sms.enabled && appConfig.sms.provider === "twilio") {
        return new TwilioSmsProvider();
    }

    return new NoopSmsProvider();
};

export { createSmsProvider };
