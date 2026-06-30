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
enabled.

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
| `MEDIA_STORAGE_PROVIDER` | Optional | `cloudinary` | Active media provider |
| `VIDEO_STREAMING_ENABLED` | Optional | `true` | Enables HTTP Range stream endpoint |
| `THUMBNAIL_GENERATION_ENABLED` | Optional | `false` local, `true` production | Enables thumbnail generation |
| `THUMBNAIL_WIDTH` | Optional | `1280` | Generated thumbnail width |
| `THUMBNAIL_HEIGHT` | Optional | `720` | Generated thumbnail height |
| `THUMBNAIL_FORMAT` | Optional | `jpg` | Generated thumbnail format |

The active provider remains Cloudinary. The stream endpoint proxies trusted
stored media URLs and supports Range responses when the upstream provider
supports them.

## AWS/S3 Readiness

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `AWS_REGION` | Optional | `ap-south-1` | Future AWS region placeholder |
| `AWS_S3_BUCKET` | Optional | empty | Future S3 bucket placeholder |
| `AWS_ACCESS_KEY_ID` | Optional | empty | Future AWS access key placeholder |
| `AWS_SECRET_ACCESS_KEY` | Optional | empty | Future AWS secret placeholder |
| `AWS_S3_PUBLIC_BASE_URL` | Optional | empty | Future S3 public base URL |

AWS values are placeholders only. S3 storage is not active unless a future S3
provider is implemented and enabled.

## CI Notes

GitHub Actions uses placeholder environment values and does not connect to
production services. Database-backed integration tests are disabled by default
with `RUN_DATABASE_TESTS=false`.
