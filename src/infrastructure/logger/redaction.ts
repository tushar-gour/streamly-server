// @ts-nocheck
const redactedValue = "[REDACTED]";

const sensitiveKeyPattern =
    /(password|token|secret|authorization|cookie|apiKey|api_key|databaseUrl|database_url|redisUrl|redis_url|refreshTokenHash|sessionTokenHash)/i;

const redactValue = (value) => {
    if (Array.isArray(value)) {
        return value.map((entry) => redactValue(entry));
    }

    if (!value || typeof value !== "object") {
        return value;
    }

    const redacted = {};

    for (const [key, entryValue] of Object.entries(value)) {
        redacted[key] = sensitiveKeyPattern.test(key)
            ? redactedValue
            : redactValue(entryValue);
    }

    return redacted;
};

const serializeError = (error, includeStack = false) => {
    if (!error) {
        return null;
    }

    return redactValue({
        name: error.name,
        message: error.message,
        code: error.code,
        type: error.type,
        statusCode: error.statusCode,
        stack: includeStack ? error.stack : undefined,
    });
};

export { redactValue, redactedValue, serializeError };
