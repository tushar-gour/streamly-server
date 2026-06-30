import { appConfig } from "../../../config/env.js";
import { NoopWhatsAppProvider } from "./noop-whatsapp.provider.js";
import { TwilioWhatsAppProvider } from "./twilio-whatsapp.provider.js";

const createWhatsAppProvider = () => {
    if (
        appConfig.sms.enabled &&
        appConfig.sms.provider === "twilio" &&
        appConfig.sms.twilioWhatsAppFrom
    ) {
        return new TwilioWhatsAppProvider();
    }

    return new NoopWhatsAppProvider();
};

export { createWhatsAppProvider };
