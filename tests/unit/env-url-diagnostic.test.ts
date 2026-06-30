import { describe, expect, it } from "vitest";

import { createEnvUrlDiagnostic } from "../../src/config/env.js";

const postgresProtocols = ["postgresql", "postgres"];
const redisProtocols = ["redis", "rediss"];

describe("environment URL diagnostics", () => {
    it("accepts Prisma PostgreSQL URLs with query params", () => {
        const diagnostic = createEnvUrlDiagnostic(
            "DATABASE_URL",
            "postgresql://user:p%40ss%23@db.example.com:5432/streamly?schema=public",
            postgresProtocols,
            { requirePath: true }
        );

        expect(diagnostic).toMatchObject({
            isValid: true,
            protocol: "postgresql",
            hasHost: true,
            hasPath: true,
            hasQuery: true,
            reason: "valid",
        });
    });

    it("accepts postgres URLs with sslmode query params", () => {
        const diagnostic = createEnvUrlDiagnostic(
            "DATABASE_URL",
            "postgres://user:password@db.example.com:5432/streamly?sslmode=require",
            postgresProtocols,
            { requirePath: true }
        );

        expect(diagnostic).toMatchObject({
            isValid: true,
            protocol: "postgres",
            hasHost: true,
            hasPath: true,
            hasQuery: true,
            reason: "valid",
        });
    });

    it("rejects PostgreSQL URLs missing database path", () => {
        const diagnostic = createEnvUrlDiagnostic(
            "DATABASE_URL",
            "postgresql://user:password@db.example.com:5432",
            postgresProtocols,
            { requirePath: true }
        );

        expect(diagnostic).toMatchObject({
            isValid: false,
            protocol: "postgresql",
            hasHost: true,
            hasPath: false,
            reason: "missing-database-path",
        });
    });

    it("rejects duplicated env assignment prefixes", () => {
        const diagnostic = createEnvUrlDiagnostic(
            "DATABASE_URL",
            "DATABASE_URL=postgresql://user:password@db.example.com:5432/streamly?schema=public",
            postgresProtocols,
            { requirePath: true }
        );

        expect(diagnostic).toMatchObject({
            isValid: false,
            protocol: null,
            hasHost: false,
            hasPath: false,
            hasQuery: false,
            reason: "parse-error",
        });
    });

    it("accepts Redis and Upstash TLS Redis URLs", () => {
        const redisDiagnostic = createEnvUrlDiagnostic(
            "REDIS_URL",
            "redis://localhost:6379",
            redisProtocols
        );
        const upstashDiagnostic = createEnvUrlDiagnostic(
            "REDIS_URL",
            "rediss://default:p%40ss%23@wanted-horse-12345.upstash.io:6379",
            redisProtocols
        );

        expect(redisDiagnostic).toMatchObject({
            isValid: true,
            protocol: "redis",
            hasHost: true,
            reason: "valid",
        });
        expect(upstashDiagnostic).toMatchObject({
            isValid: true,
            protocol: "rediss",
            hasHost: true,
            reason: "valid",
        });
    });

    it("rejects unsupported Redis URL protocols", () => {
        const diagnostic = createEnvUrlDiagnostic(
            "REDIS_URL",
            "https://redis.example.com",
            redisProtocols
        );

        expect(diagnostic).toMatchObject({
            isValid: false,
            protocol: "https",
            hasHost: true,
            reason: "unsupported-protocol",
        });
    });
});
