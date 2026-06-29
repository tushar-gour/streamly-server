import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "../../src/infrastructure/database/prisma/client.js";
import { PrismaUserRepository } from "../../src/infrastructure/repositories/user.repository.js";
import {
    assertSafeTestDatabase,
    canRunDatabaseTests,
} from "../helpers/test-database.js";
import { createTestUserData } from "../factories/user.factory.js";

const databaseDescribe = canRunDatabaseTests() ? describe : describe.skip;

databaseDescribe("PrismaUserRepository", () => {
    const repository = new PrismaUserRepository();
    const createdUserIds = [];

    afterEach(async () => {
        assertSafeTestDatabase();

        if (createdUserIds.length === 0) return;

        await prisma.user.deleteMany({
            where: { id: { in: createdUserIds } },
        });
        createdUserIds.length = 0;
    });

    it("creates and finds a user without exposing password", async () => {
        assertSafeTestDatabase();

        const userData = createTestUserData();
        const createdUser = await repository.createUser(userData);
        createdUserIds.push(createdUser._id);

        const foundUser = await repository.findByCredentials(userData.email);

        expect(createdUser.email).toBe(userData.email);
        expect(createdUser.password).toBeUndefined();
        expect(foundUser._id).toBe(createdUser._id);
        expect(foundUser.isPasswordCorrect).toBeTypeOf("function");
    });
});
