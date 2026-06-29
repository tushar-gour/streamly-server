import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        setupFiles: ["./tests/setup/test-env.js"],
        include: ["tests/**/*.test.js"],
        fileParallelism: false,
        testTimeout: 30000,
        hookTimeout: 30000,
        coverage: {
            provider: "v8",
            reporter: ["text", "lcov"],
            reportsDirectory: "coverage",
            include: ["src/**/*.js"],
            exclude: ["src/index.js", "src/workers/**"],
        },
    },
});
