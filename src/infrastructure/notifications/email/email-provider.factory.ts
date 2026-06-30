import { appConfig } from "../../../config/env.js";
import { NoopEmailProvider } from "./noop-email.provider.js";
import { SendGridEmailProvider } from "./sendgrid-email.provider.js";

const createEmailProvider = () => {
    if (appConfig.email.enabled && appConfig.email.provider === "sendgrid") {
        return new SendGridEmailProvider();
    }

    return new NoopEmailProvider();
};

export { createEmailProvider };
