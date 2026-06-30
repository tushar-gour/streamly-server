import dotenv from "dotenv";

dotenv.config({
    path: "./.env",
});

class StartupConfigError extends Error {
    missingKeys: string[];
    diagnostics: EnvUrlDiagnostic[];

    constructor(missingKeys: string[], diagnostics: EnvUrlDiagnostic[] = []) {
        super(
            [
                missingKeys.length > 0
                    ? `Missing required environment variables: ${missingKeys.join(", ")}`
                    : "",
                diagnostics.length > 0
                    ? `Invalid environment variables: ${formatEnvUrlDiagnostics(diagnostics)}`
                    : "",
            ]
                .filter(Boolean)
                .join("; ")
        );
        this.name = "StartupConfigError";
        this.missingKeys = missingKeys;
        this.diagnostics = diagnostics;
    }
}

type EnvUrlDiagnostic = {
    key: string;
    protocol: string | null;
    hasHost: boolean;
    hasPath: boolean;
    hasQuery: boolean;
    isValid: boolean;
    reason: string;
};

const readEnv = (key: string, fallback = ""): string =>
    process.env[key]?.trim() || fallback;
const readBooleanEnv = (key: string, fallback = false): boolean => {
    const value = readEnv(key);
    if (!value) return fallback;
    return value === "true";
};

const readNumberEnv = (key: string, fallback: number): number => {
    const value = Number(readEnv(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
};

const readTrustProxy = (): boolean | number | string => {
    const value = readEnv("TRUST_PROXY", "false");

    if (value === "true") return true;
    if (value === "false") return false;

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : value;
};

const configuredNodeEnv = readEnv("NODE_ENV", "development");
const configuredIsProduction = configuredNodeEnv === "production";

const createEnvUrlDiagnostic = (
    key: string,
    value: string,
    allowedProtocols: string[],
    { requirePath = false }: { requirePath?: boolean } = {}
): EnvUrlDiagnostic => {
    const safeValue = value.trim();
    const fallbackDiagnostic = {
        key,
        protocol: null,
        hasHost: false,
        hasPath: false,
        hasQuery: false,
        isValid: false,
        reason: "missing",
    };

    if (!safeValue) return fallbackDiagnostic;

    try {
        const parsedUrl = new URL(safeValue);
        const protocol = parsedUrl.protocol.replace(/:$/u, "");
        const hasHost = Boolean(parsedUrl.hostname);
        const hasPath = Boolean(
            parsedUrl.pathname && parsedUrl.pathname !== "/"
        );
        const hasQuery = Boolean(parsedUrl.search);

        if (!allowedProtocols.includes(protocol)) {
            return {
                key,
                protocol,
                hasHost,
                hasPath,
                hasQuery,
                isValid: false,
                reason: "unsupported-protocol",
            };
        }

        if (!hasHost) {
            return {
                key,
                protocol,
                hasHost,
                hasPath,
                hasQuery,
                isValid: false,
                reason: "missing-host",
            };
        }

        if (requirePath && !hasPath) {
            return {
                key,
                protocol,
                hasHost,
                hasPath,
                hasQuery,
                isValid: false,
                reason: "missing-database-path",
            };
        }

        return {
            key,
            protocol,
            hasHost,
            hasPath,
            hasQuery,
            isValid: true,
            reason: "valid",
        };
    } catch {
        const protocolMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//u.exec(
            safeValue
        );

        return {
            ...fallbackDiagnostic,
            reason: "parse-error",
            protocol: protocolMatch?.[1] || null,
        };
    }
};

const getEnvUrlDiagnostics = (): EnvUrlDiagnostic[] => [
    createEnvUrlDiagnostic(
        "DATABASE_URL",
        appConfig.database.url,
        ["postgresql", "postgres"],
        { requirePath: true }
    ),
    createEnvUrlDiagnostic("REDIS_URL", appConfig.redis.url, [
        "redis",
        "rediss",
    ]),
];

const formatEnvUrlDiagnostics = (diagnostics: EnvUrlDiagnostic[]) =>
    diagnostics
        .map(
            (diagnostic) =>
                `${diagnostic.key} (${diagnostic.reason}, protocol=${diagnostic.protocol || "<none>"}, host=${diagnostic.hasHost}, path=${diagnostic.hasPath}, query=${diagnostic.hasQuery})`
        )
        .join(", ");

const appConfig = Object.freeze({
    nodeEnv: configuredNodeEnv,
    packageVersion: readEnv("npm_package_version", "1.0.0"),
    port: readEnv("PORT", "8000"),
    corsOrigin: readEnv("CORS_ORIGIN", "*"),
    publicBaseUrl: readEnv("APP_PUBLIC_BASE_URL", "http://localhost:8000"),
    serverPublicBaseUrl: readEnv(
        "SERVER_PUBLIC_BASE_URL",
        readEnv("APP_PUBLIC_BASE_URL", "http://localhost:8000")
    ),
    security: Object.freeze({
        corsCredentials: readBooleanEnv("CORS_CREDENTIALS", true),
        corsExposeHeaders: readEnv(
            "CORS_EXPOSE_HEADERS",
            "Content-Range,Accept-Ranges,Content-Length,Content-Type"
        ),
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
            "https://streamly.zytheran.me"
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
    mfa: Object.freeze({
        enabled: readBooleanEnv("MFA_ENABLED", false),
        issuer: readEnv("MFA_ISSUER", "Streamly"),
        trustTokenExpirySeconds: readNumberEnv(
            "MFA_TRUST_TOKEN_EXPIRY_SECONDS",
            1800
        ),
        challengeExpirySeconds: readNumberEnv(
            "MFA_CHALLENGE_EXPIRY_SECONDS",
            300
        ),
        deviceCookieName: readEnv(
            "MFA_DEVICE_COOKIE_NAME",
            "streamly_device_id"
        ),
        trustCookieName: readEnv("MFA_TRUST_COOKIE_NAME", "streamly_mfa_trust"),
        maxVerifyAttempts: readNumberEnv("MFA_MAX_VERIFY_ATTEMPTS", 5),
        secretEncryptionKey: readEnv("MFA_SECRET_ENCRYPTION_KEY"),
    }),
    otp: Object.freeze({
        enabled: readBooleanEnv("OTP_ENABLED", false),
        expirySeconds: readNumberEnv("OTP_EXPIRY_SECONDS", 300),
        length: readNumberEnv("OTP_LENGTH", 6),
        maxAttempts: readNumberEnv("OTP_MAX_ATTEMPTS", 5),
        resendCooldownSeconds: readNumberEnv("OTP_RESEND_COOLDOWN_SECONDS", 60),
    }),
    captcha: Object.freeze({
        enabled: readBooleanEnv("CAPTCHA_ENABLED", false),
        provider: readEnv("CAPTCHA_PROVIDER", "noop"),
        turnstileSecretKey: readEnv("TURNSTILE_SECRET_KEY"),
        turnstileSiteKey: readEnv("TURNSTILE_SITE_KEY"),
        smartMode: readBooleanEnv("CAPTCHA_SMART_MODE", true),
        failureThreshold: readNumberEnv("CAPTCHA_FAILURE_THRESHOLD", 3),
        trustTtlSeconds: readNumberEnv("CAPTCHA_TRUST_TTL_SECONDS", 1800),
    }),
    email: Object.freeze({
        enabled: readBooleanEnv("EMAIL_ENABLED", false),
        provider: readEnv("EMAIL_PROVIDER", "noop"),
        sendgridApiKey: readEnv("SENDGRID_API_KEY"),
        sendgridFromEmail: readEnv("SENDGRID_FROM_EMAIL"),
        sendgridFromName: readEnv("SENDGRID_FROM_NAME", "Streamly"),
    }),
    sms: Object.freeze({
        enabled: readBooleanEnv("SMS_ENABLED", false),
        provider: readEnv("SMS_PROVIDER", "noop"),
        twilioAccountSid: readEnv("TWILIO_ACCOUNT_SID"),
        twilioAuthToken: readEnv("TWILIO_AUTH_TOKEN"),
        twilioPhoneNumber: readEnv("TWILIO_PHONE_NUMBER"),
        twilioWhatsAppFrom: readEnv("TWILIO_WHATSAPP_FROM"),
        twilioMessagingServiceSid: readEnv("TWILIO_MESSAGING_SERVICE_SID"),
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
    media: Object.freeze({
        storageProvider: readEnv("MEDIA_STORAGE_PROVIDER", "cloudinary"),
        videoStreamingEnabled: readBooleanEnv("VIDEO_STREAMING_ENABLED", true),
        thumbnailGenerationEnabled: readBooleanEnv(
            "THUMBNAIL_GENERATION_ENABLED",
            false
        ),
        thumbnailWidth: readNumberEnv("THUMBNAIL_WIDTH", 1280),
        thumbnailHeight: readNumberEnv("THUMBNAIL_HEIGHT", 720),
        thumbnailFormat: readEnv("THUMBNAIL_FORMAT", "jpg"),
    }),
    aws: Object.freeze({
        region: readEnv("AWS_REGION", "ap-south-1"),
        s3Bucket: readEnv("AWS_S3_BUCKET"),
        accessKeyId: readEnv("AWS_ACCESS_KEY_ID"),
        secretAccessKey: readEnv("AWS_SECRET_ACCESS_KEY"),
        s3PublicBaseUrl: readEnv("AWS_S3_PUBLIC_BASE_URL"),
        s3ForcePathStyle: readBooleanEnv("AWS_S3_FORCE_PATH_STYLE", false),
    }),
});

const requiredStartupEnvKeys = Object.freeze([
    "DATABASE_URL",
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
]);

const isProduction = () => appConfig.nodeEnv === "production";

const getMissingStartupEnvKeys = () =>
    requiredStartupEnvKeys.filter((key) => !readEnv(key));

const assertStartupConfig = () => {
    const missingKeys = getMissingStartupEnvKeys();
    const invalidUrlDiagnostics = getEnvUrlDiagnostics().filter(
        (diagnostic) =>
            !diagnostic.isValid && !missingKeys.includes(diagnostic.key)
    );

    if (appConfig.email.enabled && appConfig.email.provider === "sendgrid") {
        if (!appConfig.email.sendgridApiKey)
            missingKeys.push("SENDGRID_API_KEY");
        if (!appConfig.email.sendgridFromEmail)
            missingKeys.push("SENDGRID_FROM_EMAIL");
    }

    if (appConfig.sms.enabled && appConfig.sms.provider === "twilio") {
        if (!appConfig.sms.twilioAccountSid)
            missingKeys.push("TWILIO_ACCOUNT_SID");
        if (!appConfig.sms.twilioAuthToken)
            missingKeys.push("TWILIO_AUTH_TOKEN");
        if (
            !appConfig.sms.twilioPhoneNumber &&
            !appConfig.sms.twilioMessagingServiceSid
        ) {
            missingKeys.push(
                "TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID"
            );
        }
    }

    if (
        appConfig.captcha.enabled &&
        appConfig.captcha.provider === "turnstile"
    ) {
        if (!appConfig.captcha.turnstileSecretKey)
            missingKeys.push("TURNSTILE_SECRET_KEY");
    }

    if (appConfig.media.storageProvider === "s3") {
        if (!appConfig.aws.s3Bucket) missingKeys.push("AWS_S3_BUCKET");
    } else {
        if (!appConfig.cloudinary.cloudName)
            missingKeys.push("CLOUDINARY_CLOUD_NAME");
        if (!appConfig.cloudinary.apiKey)
            missingKeys.push("CLOUDINARY_API_KEY");
        if (!appConfig.cloudinary.apiSecret)
            missingKeys.push("CLOUDINARY_API_SECRET");
    }

    if (appConfig.mfa.enabled && !appConfig.mfa.secretEncryptionKey) {
        missingKeys.push("MFA_SECRET_ENCRYPTION_KEY");
    }

    if (missingKeys.length > 0 || invalidUrlDiagnostics.length > 0) {
        throw new StartupConfigError(missingKeys, invalidUrlDiagnostics);
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
    createEnvUrlDiagnostic,
    formatEnvUrlDiagnostics,
    getEnvUrlDiagnostics,
    getMissingStartupEnvKeys,
    isProduction,
    requiredStartupEnvKeys,
    StartupConfigError,
};
