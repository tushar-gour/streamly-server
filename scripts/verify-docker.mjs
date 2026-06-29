import { spawn } from "node:child_process";
import { access } from "node:fs/promises";

const dockerEnvPath = ".env.docker";
const healthUrl = "http://127.0.0.1:8000/api/v1/healthcheck";
const detailedHealthUrl = "http://127.0.0.1:8000/api/v1/healthcheck/detailed";
const nginxHealthUrl = "http://localhost:8080/api/v1/healthcheck";
const nginxDocsSpecUrl = "http://localhost:8080/api/v1/docs/openapi.json";

const collectRouteCount = async () => {
    const originalConsoleLog = console.log;
    console.log = () => {};
    const { app } = await import("../src/app.js");
    console.log = originalConsoleLog;

    let routeCount = 0;

    for (const layer of app._router.stack) {
        if (layer.route) {
            routeCount += 1;
            continue;
        }

        if (layer.name !== "router" || !layer.handle?.stack) {
            continue;
        }

        routeCount += layer.handle.stack.filter(
            (nestedLayer) => nestedLayer.route
        ).length;
    }

    return routeCount;
};

const ensureDockerEnvExists = async () => {
    try {
        await access(dockerEnvPath);
    } catch {
        throw new Error(
            "Missing .env.docker. Copy .env.docker.example to .env.docker and retry."
        );
    }
};

const explainDockerError = (message) => {
    if (
        message.includes("docker_engine") ||
        message.includes("Cannot connect to the Docker daemon")
    ) {
        return `${message}\nDocker daemon unavailable. Start Docker Desktop and retry.`;
    }

    if (message.includes("Access is denied")) {
        return `${message}\nDocker config access denied. Check Docker Desktop permissions.`;
    }

    return message;
};

const run = (command, args, options = {}) =>
    new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: options.stdio || "pipe",
            shell: process.platform === "win32",
        });

        let stdout = "";
        let stderr = "";

        child.stdout?.on("data", (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr?.on("data", (chunk) => {
            stderr += chunk.toString();
        });

        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
                return;
            }

            reject(
                new Error(
                    `${command} ${args.join(" ")} failed with exit code ${code}\n${stderr || stdout}`
                )
            );
        });
    });

const waitForHealth = async (url, timeoutMs = 60000) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return response;
            }
        } catch {
            // Retry until timeout.
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error(`Health route did not become ready: ${url}`);
};

try {
    await ensureDockerEnvExists();
    await run("docker", ["--version"]);
    await run("docker", ["info"]);
    await run("docker", ["compose", "config"]);
    await run("npm", ["run", "smoke"]);
    const routeCount = await collectRouteCount();
    await run("docker", ["compose", "down", "--remove-orphans"]);
    await run("docker", ["compose", "up", "--build", "-d"], {
        stdio: "inherit",
    });

    const healthResponse = await waitForHealth(healthUrl);
    const healthBody = await healthResponse.json();
    const detailedHealthResponse = await waitForHealth(detailedHealthUrl);
    const detailedHealthBody = await detailedHealthResponse.json();
    const psResult = await run("docker", ["compose", "ps"]);
    const redisServiceRegistered = psResult.stdout.includes("redis");
    const workerServiceRegistered = psResult.stdout.includes("worker");
    const nginxServiceRegistered = psResult.stdout.includes("nginx");
    const workerServiceRunning = /worker.*Up/.test(psResult.stdout);
    const nginxServiceRunning = /nginx.*Up/.test(psResult.stdout);
    const redisHealth =
        detailedHealthBody.data?.services?.redis?.connected === true;
    const nginxHealthResponse = await waitForHealth(nginxHealthUrl);
    const nginxHealthBody = await nginxHealthResponse.json();
    const nginxDocsResponse = await waitForHealth(nginxDocsSpecUrl);
    const nginxDocsBody = await nginxDocsResponse.json();

    if (!redisServiceRegistered) {
        throw new Error("Redis service was not found in docker compose ps.");
    }

    if (!redisHealth) {
        throw new Error("Redis health check did not report connected.");
    }

    if (!workerServiceRegistered) {
        throw new Error("Worker service was not found in docker compose ps.");
    }

    if (!workerServiceRunning) {
        throw new Error("Worker service is not running.");
    }

    if (!nginxServiceRegistered) {
        throw new Error("Nginx service was not found in docker compose ps.");
    }

    if (!nginxServiceRunning) {
        throw new Error("Nginx service is not running.");
    }

    if (nginxDocsBody.openapi !== "3.1.0") {
        throw new Error("Nginx OpenAPI JSON check failed.");
    }

    console.log("Docker verification passed.");
    console.log(`Health URL: ${healthUrl}`);
    console.log(`Health status code: ${healthResponse.status}`);
    console.log(`Health success: ${healthBody.success}`);
    console.log(`Nginx health URL: ${nginxHealthUrl}`);
    console.log(`Nginx health status code: ${nginxHealthResponse.status}`);
    console.log(`Nginx health success: ${nginxHealthBody.success}`);
    console.log(`Nginx OpenAPI URL: ${nginxDocsSpecUrl}`);
    console.log(`Nginx OpenAPI version: ${nginxDocsBody.openapi}`);
    console.log(`Redis service registered: ${redisServiceRegistered}`);
    console.log(`Redis connected: ${redisHealth}`);
    console.log(`Worker service registered: ${workerServiceRegistered}`);
    console.log(`Worker service running: ${workerServiceRunning}`);
    console.log(`Nginx service registered: ${nginxServiceRegistered}`);
    console.log(`Nginx service running: ${nginxServiceRunning}`);
    console.log(`Registered route handlers: ${routeCount}`);
    console.log(psResult.stdout.trim());
} catch (error) {
    console.error("Docker verification failed.");
    console.error(explainDockerError(error.message));
    process.exitCode = 1;
} finally {
    await run("docker", ["compose", "down"]).catch(() => {});
}
