import http from "node:http";

import {
    appConfig,
    assertStartupConfig,
    StartupConfigError,
} from "../src/config/env.js";
import connectDB, {
    databaseConnection,
} from "../src/infrastructure/database/prisma-connection.js";
import { redisService } from "../src/infrastructure/redis/redis.service.js";

const collectRoutes = (expressApp) => {
    const routes = [];

    for (const layer of expressApp._router.stack) {
        if (layer.route) {
            routes.push(layer.route.path);
            continue;
        }

        if (layer.name !== "router" || !layer.handle?.stack) {
            continue;
        }

        for (const nestedLayer of layer.handle.stack) {
            if (nestedLayer.route) {
                routes.push(nestedLayer.route.path);
            }
        }
    }

    return routes;
};

const runLiveVerification = async () => {
    assertStartupConfig();

    const originalConsoleLog = console.log;
    console.log = () => {};
    const { app } = await import("../src/app.js");
    console.log = originalConsoleLog;

    let server;

    try {
        await connectDB();
        await redisService.connect();

        server = http.createServer(app);
        await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(0, "127.0.0.1", resolve);
        });

        const { port } = server.address();
        const healthResponse = await fetch(
            `http://127.0.0.1:${port}/api/v1/healthcheck`
        );
        const healthBody = await healthResponse.json();
        const routes = collectRoutes(app);

        if (healthResponse.status !== 200) {
            throw new Error(`Health route returned ${healthResponse.status}`);
        }

        if (routes.length !== 43) {
            throw new Error(
                `Expected 43 route handlers, found ${routes.length}`
            );
        }

        console.log("Live verification passed.");
        console.log(`Environment: ${appConfig.nodeEnv}`);
        console.log(
            `PostgreSQL connected: ${databaseConnection.isConnected()}`
        );
        console.log(`Redis connected: ${redisService.isConnected()}`);
        console.log(`Health status code: ${healthResponse.status}`);
        console.log(`Health response success: ${healthBody.success}`);
        console.log(`Registered route handlers: ${routes.length}`);
    } finally {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }

        await databaseConnection.disconnect();
        await redisService.disconnect();
    }
};

try {
    await runLiveVerification();
} catch (error) {
    if (error instanceof StartupConfigError) {
        console.error("Live verification blocked.");
        console.error(error.message);
        console.error("Create .env from .env.example and retry.");
    } else {
        console.error("Live verification failed.");
        console.error(error.message);
    }

    process.exit(1);
}
