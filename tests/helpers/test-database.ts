// @ts-nocheck
const testDatabasePattern = /(test|streamly_test)/i;

const getTestDatabaseUrl = () =>
    process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";

const canRunDatabaseTests = () =>
    process.env.RUN_DATABASE_TESTS === "true" &&
    testDatabasePattern.test(getTestDatabaseUrl());

const assertSafeTestDatabase = () => {
    if (!canRunDatabaseTests()) {
        throw new Error(
            "Database tests require RUN_DATABASE_TESTS=true and a test DATABASE_URL."
        );
    }
};

export { assertSafeTestDatabase, canRunDatabaseTests };
