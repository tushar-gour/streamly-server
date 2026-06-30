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
process.env.EMAIL_ENABLED = process.env.EMAIL_ENABLED || "false";
process.env.EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "noop";
process.env.SMS_ENABLED = process.env.SMS_ENABLED || "false";
process.env.SMS_PROVIDER = process.env.SMS_PROVIDER || "noop";
process.env.TWILIO_WHATSAPP_FROM =
    process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
process.env.MFA_ENABLED = process.env.MFA_ENABLED || "false";
process.env.MFA_SECRET_ENCRYPTION_KEY =
    process.env.MFA_SECRET_ENCRYPTION_KEY || "";
process.env.OTP_ENABLED = process.env.OTP_ENABLED || "false";
process.env.CAPTCHA_ENABLED = process.env.CAPTCHA_ENABLED || "false";
process.env.CAPTCHA_PROVIDER = process.env.CAPTCHA_PROVIDER || "noop";
process.env.TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || "";
process.env.TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY || "";
process.env.CLOUDINARY_CLOUD_NAME =
    process.env.CLOUDINARY_CLOUD_NAME || "test_cloud";
process.env.CLOUDINARY_API_KEY =
    process.env.CLOUDINARY_API_KEY || "test_api_key";
process.env.CLOUDINARY_API_SECRET =
    process.env.CLOUDINARY_API_SECRET || "test_api_secret";
process.env.MOCK_CLOUDINARY = process.env.MOCK_CLOUDINARY || "true";
process.env.THUMBNAIL_GENERATION_ENABLED =
    process.env.THUMBNAIL_GENERATION_ENABLED || "false";
