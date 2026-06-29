import dotenv from "dotenv";

dotenv.config({
    path: "./.env",
});

class StartupConfigError extends Error {
    constructor(missingKeys) {
        super(
            `Missing required environment variables: ${missingKeys.join(", ")}`
        );
        this.name = "StartupConfigError";
        this.missingKeys = missingKeys;
    }
}

const readEnv = (key, fallback = "") => process.env[key] || fallback;
const readBooleanEnv = (key, fallback = false) => {
    const value = readEnv(key);
    if (!value) return fallback;
    return value === "true";
};

const readNumberEnv = (key, fallback) => {
    const value = Number(readEnv(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
};

const readTrustProxy = () => {
    const value = readEnv("TRUST_PROXY", "false");

    if (value === "true") return true;
    if (value === "false") return false;

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : value;
};

const configuredNodeEnv = readEnv("NODE_ENV", "development");
const configuredIsProduction = configuredNodeEnv === "production";

const appConfig = Object.freeze({
    nodeEnv: configuredNodeEnv,
    packageVersion: readEnv("npm_package_version", "1.0.0"),
    port: readEnv("PORT", "8000"),
    corsOrigin: readEnv("CORS_ORIGIN", "*"),
    publicBaseUrl: readEnv("APP_PUBLIC_BASE_URL", "http://localhost:8000"),
    security: Object.freeze({
        corsCredentials: readBooleanEnv("CORS_CREDENTIALS", true),
        trustProxy: readTrustProxy(),
        jsonBodyLimit: readEnv("JSON_BODY_LIMIT", "16kb"),
        urlencodedBodyLimit: readEnv("URLENCODED_BODY_LIMIT", "16kb"),
        cookieSecure: readBooleanEnv("COOKIE_SECURE", configuredIsProduction),
        cookieSameSite: readEnv("COOKIE_SAME_SITE", "strict"),
        rateLimitWindowMs: readNumberEnv("RATE_LIMIT_WINDOW_MS", 15 * 60_000),
        rateLimitMax: readNumberEnv("RATE_LIMIT_MAX", 1000),
        authRateLimitWindowMs: readNumberEnv(
            "AUTH_RATE_LIMIT_WINDOW_MS",
            15 * 60_000
        ),
        authRateLimitMax: readNumberEnv("AUTH_RATE_LIMIT_MAX", 25),
    }),
    test: Object.freeze({
        disableRateLimiting: readBooleanEnv(
            "DISABLE_RATE_LIMITING_IN_TEST",
            configuredNodeEnv === "test"
        ),
        mockCloudinary: readBooleanEnv("MOCK_CLOUDINARY", false),
    }),
    logger: Object.freeze({
        level: readEnv("LOG_LEVEL", "info"),
        format: readEnv("LOG_FORMAT", "json"),
        requestIdHeader: readEnv("REQUEST_ID_HEADER", "x-request-id"),
        correlationIdHeader: readEnv(
            "CORRELATION_ID_HEADER",
            "x-correlation-id"
        ),
    }),
    database: Object.freeze({
        url: readEnv("DATABASE_URL"),
    }),
    redis: Object.freeze({
        enabled: readEnv("REDIS_ENABLED", "true") !== "false",
        url: readEnv("REDIS_URL", "redis://localhost:6379"),
    }),
    jobs: Object.freeze({
        enabled: readBooleanEnv("JOBS_ENABLED", true),
        workerConcurrency: readNumberEnv("WORKER_CONCURRENCY", 5),
        attempts: readNumberEnv("JOB_ATTEMPTS", 3),
        backoffMs: readNumberEnv("JOB_BACKOFF_MS", 5000),
        emailQueueEnabled: readBooleanEnv("EMAIL_QUEUE_ENABLED", true),
        notificationQueueEnabled: readBooleanEnv(
            "NOTIFICATION_QUEUE_ENABLED",
            true
        ),
        cleanupQueueEnabled: readBooleanEnv("CLEANUP_QUEUE_ENABLED", true),
        thumbnailQueueEnabled: readBooleanEnv("THUMBNAIL_QUEUE_ENABLED", false),
    }),
    cache: Object.freeze({
        enabled: readBooleanEnv("CACHE_ENABLED", true),
        defaultTtlSeconds: readNumberEnv("CACHE_DEFAULT_TTL_SECONDS", 60),
        videoListTtlSeconds: readNumberEnv("CACHE_VIDEO_LIST_TTL_SECONDS", 60),
        videoCommentsTtlSeconds: readNumberEnv(
            "CACHE_VIDEO_COMMENTS_TTL_SECONDS",
            30
        ),
    }),
    docs: Object.freeze({
        enabled: readBooleanEnv("API_DOCS_ENABLED", true),
        route: readEnv("API_DOCS_ROUTE", "/api/v1/docs"),
        specRoute: readEnv("API_DOCS_SPEC_ROUTE", "/api/v1/docs/openapi.json"),
        serverUrl: readEnv(
            "API_DOCS_SERVER_URL",
            "http://streamly.zytheran.me"
        ),
    }),
    jwt: Object.freeze({
        accessTokenSecret: readEnv("ACCESS_TOKEN_SECRET"),
        accessTokenExpiry: readEnv("ACCESS_TOKEN_EXPIRY", "15m"),
        refreshTokenSecret: readEnv("REFRESH_TOKEN_SECRET"),
        refreshTokenExpiry: readEnv("REFRESH_TOKEN_EXPIRY", "10d"),
    }),
    auth: Object.freeze({
        emailVerificationTokenExpiry: readEnv(
            "EMAIL_VERIFICATION_TOKEN_EXPIRY",
            "1d"
        ),
    }),
    rbac: Object.freeze({
        defaultRole: readEnv("RBAC_DEFAULT_ROLE", "user"),
        adminEmail: readEnv("RBAC_ADMIN_EMAIL"),
    }),
    cloudinary: Object.freeze({
        cloudName: readEnv("CLOUDINARY_CLOUD_NAME"),
        apiKey: readEnv("CLOUDINARY_API_KEY"),
        apiSecret: readEnv("CLOUDINARY_API_SECRET"),
    }),
});

const requiredStartupEnvKeys = Object.freeze([
    "DATABASE_URL",
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
]);

const isProduction = () => appConfig.nodeEnv === "production";

const getMissingStartupEnvKeys = () =>
    requiredStartupEnvKeys.filter((key) => !readEnv(key));

const assertStartupConfig = () => {
    const missingKeys = getMissingStartupEnvKeys();

    if (missingKeys.length > 0) {
        throw new StartupConfigError(missingKeys);
    }

    if (
        isProduction() &&
        appConfig.security.corsCredentials &&
        appConfig.corsOrigin === "*"
    ) {
        throw new StartupConfigError([
            "CORS_ORIGIN must be explicit when CORS_CREDENTIALS=true in production",
        ]);
    }
};

export {
    appConfig,
    assertStartupConfig,
    getMissingStartupEnvKeys,
    isProduction,
    requiredStartupEnvKeys,
    StartupConfigError,
};
