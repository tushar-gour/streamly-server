import {
    assertStartupConfig,
    formatEnvUrlDiagnostics,
    getEnvUrlDiagnostics,
    getMissingStartupEnvKeys,
} from "../src/config/env.js";

const diagnostics = getEnvUrlDiagnostics();
const invalidDiagnostics = diagnostics.filter(
    (diagnostic) => !diagnostic.isValid
);
const missingKeys = getMissingStartupEnvKeys();

for (const diagnostic of diagnostics) {
    console.log(
        `${diagnostic.key}: protocol=${diagnostic.protocol || "<none>"} host=${diagnostic.hasHost} path=${diagnostic.hasPath} query=${diagnostic.hasQuery} valid=${diagnostic.isValid}`
    );
}

try {
    assertStartupConfig();
    console.log("Environment validation passed.");
} catch {
    console.error("Environment validation failed.");

    if (missingKeys.length > 0) {
        console.error(`Missing keys: ${missingKeys.join(", ")}`);
    }

    if (invalidDiagnostics.length > 0) {
        console.error(formatEnvUrlDiagnostics(invalidDiagnostics));
    }

    process.exitCode = 1;
}
