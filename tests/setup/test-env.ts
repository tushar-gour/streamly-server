// @ts-nocheck
process.env.NODE_ENV = "test";
process.env.PORT = process.env.PORT || "0";
process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/streamly_test?schema=public";
process.env.REDIS_ENABLED = process.env.REDIS_ENABLED || "false";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
process.env.JOBS_ENABLED = process.env.JOBS_ENABLED || "false";
process.env.CACHE_ENABLED = process.env.CACHE_ENABLED || "true";
process.env.DISABLE_RATE_LIMITING_IN_TEST =
    process.env.DISABLE_RATE_LIMITING_IN_TEST || "true";
process.env.LOG_LEVEL = process.env.LOG_LEVEL || "silent";
process.env.LOG_FORMAT = process.env.LOG_FORMAT || "json";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
process.env.CORS_CREDENTIALS = process.env.CORS_CREDENTIALS || "true";
process.env.ACCESS_TOKEN_SECRET =
    process.env.ACCESS_TOKEN_SECRET || "test_access_token_secret";
process.env.ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
process.env.REFRESH_TOKEN_SECRET =
    process.env.REFRESH_TOKEN_SECRET || "test_refresh_token_secret";
process.env.REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "10d";
process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY =
    process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY || "1d";
process.env.CLOUDINARY_CLOUD_NAME =
    process.env.CLOUDINARY_CLOUD_NAME || "test_cloud";
process.env.CLOUDINARY_API_KEY =
    process.env.CLOUDINARY_API_KEY || "test_api_key";
process.env.CLOUDINARY_API_SECRET =
    process.env.CLOUDINARY_API_SECRET || "test_api_secret";
process.env.MOCK_CLOUDINARY = process.env.MOCK_CLOUDINARY || "true";
