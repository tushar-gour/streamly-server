import { createLogger, redactValue } from "./logger.js";
import { getRequestContext } from "../../presentation/middlewares/request-context.middleware.js";

const auditLogger = createLogger("audit");

const buildAuditPayload = (event, details = {}) => ({
    audit: true,
    event,
    ...getRequestContext(),
    ...redactValue(details),
});

const audit = Object.freeze({
    info(event, details = {}) {
        auditLogger.info(buildAuditPayload(event, details), "audit event");
    },

    warn(event, details = {}) {
        auditLogger.warn(buildAuditPayload(event, details), "audit event");
    },

    error(event, details = {}) {
        auditLogger.error(buildAuditPayload(event, details), "audit event");
    },
});

export { audit };
