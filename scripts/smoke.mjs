const originalConsoleLog = console.log;
console.log = () => {};

const [{ app }, { getMissingStartupEnvKeys, requiredStartupEnvKeys }] =
    await Promise.all([
        import("../src/app.js"),
        import("../src/config/env.js"),
    ]);

console.log = originalConsoleLog;

const routeSummaries = [];

for (const layer of app._router.stack) {
    if (layer.route) {
        routeSummaries.push({
            path: layer.route.path,
            methods: Object.keys(layer.route.methods),
        });
        continue;
    }

    if (layer.name === "router" && layer.handle?.stack) {
        for (const nestedLayer of layer.handle.stack) {
            if (!nestedLayer.route) continue;

            routeSummaries.push({
                path: nestedLayer.route.path,
                methods: Object.keys(nestedLayer.route.methods),
            });
        }
    }
}

const missingEnvKeys = getMissingStartupEnvKeys();

if (routeSummaries.length === 0) {
    throw new Error("Smoke check failed: no routes registered.");
}

console.log("Smoke check passed.");
console.log(`Registered route handlers: ${routeSummaries.length}`);
console.log(`Required env keys detected: ${requiredStartupEnvKeys.length}`);

if (missingEnvKeys.length > 0) {
    console.log(`Missing env keys: ${missingEnvKeys.join(", ")}`);
    console.log("Startup readiness: incomplete local .env");
} else {
    console.log("Startup readiness: complete local .env");
}
