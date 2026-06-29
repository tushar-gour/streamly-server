// @ts-nocheck
import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "../../src/app.js";
import { canRunDatabaseTests } from "../helpers/test-database.js";

const databaseDescribe = canRunDatabaseTests() ? describe : describe.skip;

describe("API contract", () => {
    it("returns health response shape", async () => {
        const response = await request(app).get("/api/v1/healthcheck");

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            statusCode: 200,
            success: true,
            message: "OK",
        });
        expect(response.body.data).toHaveProperty("status");
    });

    it("returns request id header", async () => {
        const response = await request(app)
            .get("/api/v1/healthcheck")
            .set("x-request-id", "test-request-id");

        expect(response.headers["x-request-id"]).toBe("test-request-id");
    });

    it("rejects protected current-user route without token", async () => {
        const response = await request(app).get("/api/v1/users/current-user");

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
            statusCode: 401,
            success: false,
        });
    });

    it("returns malformed JSON error shape", async () => {
        const response = await request(app)
            .post("/api/v1/users/login")
            .set("Content-Type", "application/json")
            .send("{bad-json");

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
            statusCode: 400,
            success: false,
            message: "Malformed JSON payload",
        });
    });

    it("rejects oversized JSON payload safely", async () => {
        const response = await request(app)
            .post("/api/v1/users/login")
            .send({ email: `${"a".repeat(20_000)}@example.com` });

        expect(response.status).toBe(413);
        expect(response.body).toMatchObject({
            statusCode: 413,
            success: false,
            message: "Request payload too large",
        });
    });

    it("serves OpenAPI JSON document", async () => {
        const response = await request(app).get("/api/v1/docs/openapi.json");

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            openapi: "3.1.0",
            info: {
                title: "Streamly API",
            },
        });
        expect(response.body.components.securitySchemes).toHaveProperty(
            "bearerAuth"
        );
    });

    it("serves Swagger UI", async () => {
        const response = await request(app).get("/api/v1/docs/");

        expect(response.status).toBe(200);
        expect(response.text).toContain("swagger-ui");
    });
});

databaseDescribe("API database-backed contract", () => {
    it("returns public videos response shape", async () => {
        const response = await request(app).get("/api/v1/videos");

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("data");
        expect(response.body).toHaveProperty("meta.pagination");
    });
});
