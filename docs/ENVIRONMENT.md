# Streamly Environment Variables

Use `.env.example` for local development and `.env.docker.example` for Docker.
Never commit real `.env` or `.env.docker` files.

## Server

| Variable | Required | Safe local example | Purpose |
| --- | --- | --- | --- |
| `PORT` | Yes | `8000` | Express port |
| `NODE_ENV` | Yes | `development` | Runtime environment |
| `APP_PUBLIC_BASE_URL` | Optional | `http://streamly.zytheran.me` | Public app URL for docs and links |

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
| `API_DOCS_SERVER_URL` | Optional | `http://streamly.zytheran.me` | Planned public docs server URL |

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
| `THUMBNAIL_QUEUE_ENABLED` | Optional | `false` | Thumbnail queue |

Thumbnail processing is not active product behavior.

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

## CI Notes

GitHub Actions uses placeholder environment values and does not connect to
production services. Database-backed integration tests are disabled by default
with `RUN_DATABASE_TESTS=false`.
