# Streamly Environment Variables

Use `.env.example` for local development, `.env.docker.example` for Docker,
and `.env.production.example` as the production template for manual AWS
deployment preparation. Never commit real `.env`, `.env.docker`, or
`.env.production` files.

## Server

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `PORT` | Yes | `8000` | Express port |
| `NODE_ENV` | Yes | `development` | Runtime environment |
| `APP_PUBLIC_BASE_URL` | Optional | `https://streamly.zytheran.me` | Public app URL for docs and links |

## CORS And Proxy

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `CORS_ORIGIN` | Yes | `*` | Allowed origins |
| `CORS_CREDENTIALS` | Optional | `true` | Enable credentials |
| `CORS_EXPOSE_HEADERS` | Optional | `Content-Range,...` | Streaming response headers exposed to browsers |
| `TRUST_PROXY` | Optional | `false` local, `1` Docker/Nginx | Express trust proxy |

Production should use explicit `CORS_ORIGIN` values.

## Body, Cookies, Rate Limits

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `JSON_BODY_LIMIT` | Optional | `16kb` | JSON parser limit |
| `URLENCODED_BODY_LIMIT` | Optional | `16kb` | URL-encoded parser limit |
| `COOKIE_SECURE` | Optional | `false` | Secure cookie toggle |
| `COOKIE_SAME_SITE` | Optional | `strict` | Same-site cookie mode |
| `RATE_LIMIT_WINDOW_MS` | Optional | `900000` | Global limiter window |
| `RATE_LIMIT_MAX` | Optional | `1000` | Global max requests |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Optional | `900000` | Auth limiter window |
| `AUTH_RATE_LIMIT_MAX` | Optional | `25` | Auth max requests |
| `DISABLE_RATE_LIMITING_IN_TEST` | Optional | `true` | Test bypass |

Use `COOKIE_SECURE=true` behind HTTPS.

## API Docs

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `API_DOCS_ENABLED` | Optional | `true` | Enables Swagger routes |
| `API_DOCS_ROUTE` | Optional | `/api/v1/docs` | Swagger UI path |
| `API_DOCS_SPEC_ROUTE` | Optional | `/api/v1/docs/openapi.json` | OpenAPI JSON path |
| `API_DOCS_SERVER_URL` | Optional | `https://streamly.zytheran.me` | Public docs server URL |

## Logging

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `LOG_LEVEL` | Optional | `info` | Pino log level |
| `LOG_FORMAT` | Optional | `json` | Log format |
| `REQUEST_ID_HEADER` | Optional | `x-request-id` | Request id header |
| `CORRELATION_ID_HEADER` | Optional | `x-correlation-id` | Correlation id header |

## PostgreSQL

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/streamly?schema=public` | Prisma database URL |
| `POSTGRES_DB` | Docker | `streamly` | Docker Postgres database |
| `POSTGRES_USER` | Docker | `streamly` | Docker Postgres user |
| `POSTGRES_PASSWORD` | Docker | `replace_with_password` | Docker Postgres password |

Production must use a strong database password and private network access.

## Redis

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `REDIS_ENABLED` | Optional | `true` | Enables Redis runtime |
| `REDIS_URL` | Optional | `redis://localhost:6379` | Redis URL |

Docker uses:

```txt
redis://redis:6379
```

## Jobs

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `JOBS_ENABLED` | Optional | `true` | Enables job producers/runtime |
| `WORKER_CONCURRENCY` | Optional | `5` | Worker concurrency |
| `JOB_ATTEMPTS` | Optional | `3` | Retry attempts |
| `JOB_BACKOFF_MS` | Optional | `5000` | Retry backoff |
| `EMAIL_QUEUE_ENABLED` | Optional | `true` | Email queue |
| `NOTIFICATION_QUEUE_ENABLED` | Optional | `true` | Notification queue |
| `CLEANUP_QUEUE_ENABLED` | Optional | `true` | Cleanup queue |
| `THUMBNAIL_QUEUE_ENABLED` | Optional | `false` local, `true` production | Thumbnail queue |

Thumbnail processing generates Cloudinary thumbnail transformation URLs when
enabled for Cloudinary media. S3 thumbnail workers can be extended for
ffmpeg-based frame extraction.

## Cache

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `CACHE_ENABLED` | Optional | `true` | Enables Redis cache |
| `CACHE_DEFAULT_TTL_SECONDS` | Optional | `60` | Default cache TTL |
| `CACHE_VIDEO_LIST_TTL_SECONDS` | Optional | `60` | Video list cache TTL |
| `CACHE_VIDEO_COMMENTS_TTL_SECONDS` | Optional | `30` | Comment cache TTL |

## JWT And Auth

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `ACCESS_TOKEN_SECRET` | Yes | `replace_with_access_token_secret` | JWT access secret |
| `ACCESS_TOKEN_EXPIRY` | Yes | `15m` | Access token lifetime |
| `REFRESH_TOKEN_SECRET` | Yes | `replace_with_refresh_token_secret` | Refresh token secret |
| `REFRESH_TOKEN_EXPIRY` | Yes | `10d` | Refresh token lifetime |
| `EMAIL_VERIFICATION_TOKEN_EXPIRY` | Optional | `1d` | Verification token lifetime |

Use long random secrets in production.

## MFA And OTP

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `MFA_ENABLED` | Optional | `false` | Enables authenticator MFA flow |
| `MFA_ISSUER` | Optional | `Streamly` | Authenticator issuer label |
| `MFA_SECRET_ENCRYPTION_KEY` | Conditional | empty | Required when MFA is enabled |
| `MFA_TRUST_TOKEN_EXPIRY_SECONDS` | Optional | `1800` | Trusted-device MFA skip window |
| `MFA_CHALLENGE_EXPIRY_SECONDS` | Optional | `300` | MFA challenge lifetime |
| `MFA_DEVICE_COOKIE_NAME` | Optional | `streamly_device_id` | Device id cookie |
| `MFA_TRUST_COOKIE_NAME` | Optional | `streamly_mfa_trust` | MFA trust cookie |
| `MFA_MAX_VERIFY_ATTEMPTS` | Optional | `5` | Max MFA attempts |
| `OTP_ENABLED` | Optional | `false` | Enables OTP challenge flows |
| `OTP_EXPIRY_SECONDS` | Optional | `300` | OTP lifetime |
| `OTP_LENGTH` | Optional | `6` | OTP code length |
| `OTP_MAX_ATTEMPTS` | Optional | `5` | Max OTP attempts |
| `OTP_RESEND_COOLDOWN_SECONDS` | Optional | `60` | Resend cooldown |

## Cloudflare Turnstile

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `CAPTCHA_PROVIDER` | Optional | `noop` local, `turnstile` production | Captcha provider |
| `CAPTCHA_ENABLED` | Optional | `false` | Enables captcha verification |
| `TURNSTILE_SECRET_KEY` | Conditional | empty | Server-side secret |
| `TURNSTILE_SITE_KEY` | Optional | empty | Public site key returned to clients |
| `CAPTCHA_SMART_MODE` | Optional | `true` | Risk-based captcha prompts |
| `CAPTCHA_FAILURE_THRESHOLD` | Optional | `3` | Failure count before captcha |
| `CAPTCHA_TRUST_TTL_SECONDS` | Optional | `1800` | Captcha trust TTL |

## Email / Twilio SendGrid

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `EMAIL_ENABLED` | Optional | `false` | Enables real email provider calls |
| `EMAIL_PROVIDER` | Optional | `noop` local, `sendgrid` production | Email provider |
| `SENDGRID_API_KEY` | Conditional | empty | Required when SendGrid is enabled |
| `SENDGRID_FROM_EMAIL` | Conditional | `no-reply@zytheran.me` | Verified sender email |
| `SENDGRID_FROM_NAME` | Optional | `Streamly` | Sender display name |

SendGrid credentials are required only when `EMAIL_ENABLED=true` and
`EMAIL_PROVIDER=sendgrid`.

## SMS / Twilio

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `SMS_ENABLED` | Optional | `false` | Enables real SMS provider calls |
| `SMS_PROVIDER` | Optional | `noop` local, `twilio` production | SMS provider |
| `TWILIO_ACCOUNT_SID` | Conditional | empty | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Conditional | empty | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Conditional | empty | Twilio sender phone |
| `TWILIO_WHATSAPP_FROM` | Optional | `whatsapp:+14155238886` | Twilio WhatsApp sender |
| `TWILIO_MESSAGING_SERVICE_SID` | Optional | empty | Twilio messaging service |

Twilio credentials are required only when `SMS_ENABLED=true` and
`SMS_PROVIDER=twilio`.

## RBAC

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `RBAC_DEFAULT_ROLE` | Optional | `user` | Default registration role |
| `RBAC_ADMIN_EMAIL` | Optional | empty | Optional admin seed email |

`RBAC_ADMIN_EMAIL` is only used by explicit seed command.

## Cloudinary

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Yes | `replace_with_cloud_name` | Cloudinary cloud |
| `CLOUDINARY_API_KEY` | Yes | `replace_with_api_key` | Cloudinary key |
| `CLOUDINARY_API_SECRET` | Yes | `replace_with_api_secret` | Cloudinary secret |
| `MOCK_CLOUDINARY` | Optional | `true` | Test/local mock switch |

Do not use real Cloudinary secrets in examples.

## Media Storage And Streaming

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `MEDIA_STORAGE_PROVIDER` | Optional | `cloudinary` | Active media provider: `cloudinary` or `s3` |
| `VIDEO_STREAMING_ENABLED` | Optional | `true` | Enables HTTP Range stream endpoint |
| `THUMBNAIL_GENERATION_ENABLED` | Optional | `false` local, `true` production | Enables thumbnail generation |
| `THUMBNAIL_WIDTH` | Optional | `1280` | Generated thumbnail width |
| `THUMBNAIL_HEIGHT` | Optional | `720` | Generated thumbnail height |
| `THUMBNAIL_FORMAT` | Optional | `jpg` | Generated thumbnail format |

Cloudinary remains the safe local default. S3 is available for production with
`MEDIA_STORAGE_PROVIDER=s3` and streams trusted object keys with Range reads.

## AWS/S3 Readiness

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `AWS_REGION` | Required for S3 | `ap-south-1` | AWS region |
| `AWS_S3_BUCKET` | Required for S3 | empty | S3 bucket |
| `AWS_ACCESS_KEY_ID` | Required for S3 | empty | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Required for S3 | empty | AWS secret |
| `AWS_S3_PUBLIC_BASE_URL` | Optional | empty | CloudFront or S3 public base URL |
| `AWS_S3_FORCE_PATH_STYLE` | Optional | `false` | Path-style S3 compatibility |

AWS values are required only when `MEDIA_STORAGE_PROVIDER=s3`. Tests and CI keep
S3 disabled unless explicitly configured.

## CI Notes

GitHub Actions uses placeholder environment values and does not connect to
production services. Database-backed integration tests are disabled by default
with `RUN_DATABASE_TESTS=false`.
