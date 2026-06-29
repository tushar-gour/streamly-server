// @ts-nocheck
import { describe, expect, it } from "vitest";

import {
    redactedValue,
    redactValue,
    serializeError,
} from "../../src/infrastructure/logger/redaction.js";

describe("redaction", () => {
    it("redacts sensitive nested fields", () => {
        const redacted = redactValue({
            email: "user@example.com",
            password: "secret",
            nested: {
                refreshToken: "token",
                databaseUrl: "postgres://secret",
            },
        });

        expect(redacted.email).toBe("user@example.com");
        expect(redacted.password).toBe(redactedValue);
        expect(redacted.nested.refreshToken).toBe(redactedValue);
        expect(redacted.nested.databaseUrl).toBe(redactedValue);
    });

    it("serializes errors without stack by default", () => {
        const error = new Error("failed");
        const serialized = serializeError(error);

        expect(serialized).toMatchObject({
            name: "Error",
            message: "failed",
        });
        expect(serialized.stack).toBeUndefined();
    });
});
