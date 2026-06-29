# Streamly Backend

## Local Setup

Install dependencies:

```bash
npm install
```

Create environment file:

```bash
cp .env.example .env
```

Fill PostgreSQL, Redis, JWT, RBAC, and Cloudinary values.

Generate Prisma client:

```bash
npm run prisma:generate
```

Apply local Prisma migration:

```bash
npm run prisma:migrate
```

Start server:

```bash
npm start
```

Development mode:

```bash
npm run dev
```

## Required Environment

```env
PORT=8000
NODE_ENV=development
CORS_ORIGIN=*
CORS_CREDENTIALS=true
TRUST_PROXY=false
JSON_BODY_LIMIT=16kb
URLENCODED_BODY_LIMIT=16kb
COOKIE_SECURE=false
COOKIE_SAME_SITE=strict
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=25
DISABLE_RATE_LIMITING_IN_TEST=true
MOCK_CLOUDINARY=true
API_DOCS_ENABLED=true
API_DOCS_ROUTE=/api/v1/docs
API_DOCS_SPEC_ROUTE=/api/v1/docs/openapi.json
LOG_LEVEL=info
LOG_FORMAT=json
REQUEST_ID_HEADER=x-request-id
CORRELATION_ID_HEADER=x-correlation-id
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamly?schema=public
ACCESS_TOKEN_SECRET=replace_with_access_token_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=replace_with_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d
EMAIL_VERIFICATION_TOKEN_EXPIRY=1d
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
JOBS_ENABLED=true
WORKER_CONCURRENCY=5
JOB_ATTEMPTS=3
JOB_BACKOFF_MS=5000
EMAIL_QUEUE_ENABLED=true
NOTIFICATION_QUEUE_ENABLED=true
CLEANUP_QUEUE_ENABLED=true
THUMBNAIL_QUEUE_ENABLED=false
CACHE_ENABLED=true
CACHE_DEFAULT_TTL_SECONDS=60
CACHE_VIDEO_LIST_TTL_SECONDS=60
CACHE_VIDEO_COMMENTS_TTL_SECONDS=30
RBAC_DEFAULT_ROLE=user
RBAC_ADMIN_EMAIL=
CLOUDINARY_CLOUD_NAME=replace_with_cloud_name
CLOUDINARY_API_KEY=replace_with_api_key
CLOUDINARY_API_SECRET=replace_with_api_secret
```

Do not commit real `.env` values.

## Testing Foundation

Testing uses Vitest and Supertest.

Commands:

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:api
npm run test:coverage
```

Test defaults live in `tests/setup/test-env.js`. Unit and API contract tests use
`NODE_ENV=test`, test-safe secrets, disabled jobs, mocked Cloudinary values, and
do not require PostgreSQL, Redis, Cloudinary, or email delivery.

Repository and database-backed API tests are guarded. They only run when both
conditions are true:

```bash
RUN_DATABASE_TESTS=true
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamly_test?schema=public
```

The database URL must include `test` or `streamly_test`. This prevents
accidental cleanup against development or production databases.

Prepare a dedicated test database before enabling database tests:

```bash
createdb streamly_test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamly_test?schema=public npx prisma migrate deploy
RUN_DATABASE_TESTS=true TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamly_test?schema=public npm run test:integration
```

Redis testing strategy:

```txt
Unit tests mock Redis/cache dependencies.
API tests disable Redis by default.
Integration tests may use Redis only when explicitly configured.
No test flushes global Redis state.
```

External service strategy:

```txt
Cloudinary uses test placeholders and is not called by the base suite.
Email delivery remains stubbed.
BullMQ workers are not started by tests.
Destructive cleanup jobs are not run by tests.
```

Coverage:

```bash
npm run test:coverage
```

Coverage output is written to `coverage/`, which is ignored by git. No hard
coverage threshold is enforced yet; this phase establishes the baseline.

## API Documentation

Swagger UI is available when API docs are enabled:

```txt
http://localhost:8000/api/v1/docs
http://localhost:8080/api/v1/docs
```

OpenAPI JSON is available at:

```txt
http://localhost:8000/api/v1/docs/openapi.json
http://localhost:8080/api/v1/docs/openapi.json
```

Documentation environment:

```env
API_DOCS_ENABLED=true
API_DOCS_ROUTE=/api/v1/docs
API_DOCS_SPEC_ROUTE=/api/v1/docs/openapi.json
```

The OpenAPI document includes:

```txt
Bearer access token auth
HttpOnly access and refresh cookie auth
Refresh token endpoint behavior
Logout and logout-all behavior
RBAC permission notes
Ownership policy notes
Multipart upload fields
Pagination query parameters
Standard API success and error response shapes
```

Validate the OpenAPI document:

```bash
npm run docs:validate
```

Import the Postman collection from:

```txt
docs/postman/streamly.postman_collection.json
```

The collection uses variables only:

```txt
baseUrl
accessToken
refreshToken
```

No real tokens, credentials, Cloudinary secrets, database URLs, or Redis URLs
are included in documentation examples.

## Security Runtime

Security middleware order:

```txt
trust proxy
helmet
cors
body parsers
cookie parser
request sanitization
compression/static
HTTP request logging
global API rate limiter
routes
error handler
```

Helmet is configured for an API backend. Content Security Policy is disabled
because this service returns JSON, not HTML. HSTS is enabled only in production.

CORS supports one or multiple origins through `CORS_ORIGIN`. Wildcard origins
are allowed for local development. In production, use explicit origins when
`CORS_CREDENTIALS=true`.

Rate limiting uses in-memory limits:

```txt
Global API limit: RATE_LIMIT_MAX per RATE_LIMIT_WINDOW_MS
Auth route limit: AUTH_RATE_LIMIT_MAX per AUTH_RATE_LIMIT_WINDOW_MS
```

Redis-backed distributed rate limiting is deferred to a later phase.

Request sanitization removes null bytes and prototype-pollution keys from
`body`, `params`, and `query`. It does not strip user text or HTML, so API
clients keep existing request formats. Frontend rendering must still escape
user-generated content.

CSRF decision: auth supports `Authorization: Bearer` tokens and httpOnly
cookies. This phase does not add CSRF tokens because that would change API
client flow. Cookies remain `sameSite=strict` by default. For cross-site cookie
deployments, add an explicit CSRF token flow in a dedicated phase.

Prisma is used for database access. Raw SQL is limited to parameterized health
checks. Dynamic sort fields are allowlisted in repositories.

## Logging Runtime

Application logs use structured JSON through Pino.

Logging environment:

```env
LOG_LEVEL=info
LOG_FORMAT=json
REQUEST_ID_HEADER=x-request-id
CORRELATION_ID_HEADER=x-correlation-id
```

Every request receives a request id and correlation id. Incoming
`x-request-id` and `x-correlation-id` headers are reused when provided. The same
headers are returned in the response.

HTTP logs include method, path, status code, response time, request id,
correlation id, safe user id, IP address, and user agent. Request bodies,
cookies, authorization headers, tokens, passwords, and secrets are not logged.

Audit logs are structured JSON events for sensitive auth and authorization
activity. They are written to stdout with the normal app logs and do not create
database audit tables yet.

Logs redact sensitive fields such as passwords, access tokens, refresh tokens,
authorization headers, cookies, token hashes, API secrets, database URLs, and
Redis URLs.

Docker logs are available with:

```bash
docker compose logs app
```

Worker logs are available with:

```bash
docker compose logs worker
```

## Background Jobs Runtime

Background jobs use BullMQ with Redis.

Job environment:

```env
JOBS_ENABLED=true
WORKER_CONCURRENCY=5
JOB_ATTEMPTS=3
JOB_BACKOFF_MS=5000
EMAIL_QUEUE_ENABLED=true
NOTIFICATION_QUEUE_ENABLED=true
CLEANUP_QUEUE_ENABLED=true
THUMBNAIL_QUEUE_ENABLED=false
```

Queue names:

```txt
streamly-email
streamly-notification
streamly-thumbnail
streamly-cleanup
streamly-verification
```

Job names:

```txt
email.verification.send
notification.security.send
thumbnail.generate
cleanup.auth.expired
jobs.healthcheck
```

Start worker locally:

```bash
npm run jobs:worker
```

Verify BullMQ locally while Redis is available:

```bash
npm run verify:jobs
```

Docker Compose includes a separate `worker` service. It uses the same image as
the API but runs `npm run jobs:worker` and does not expose HTTP ports.

Email jobs currently use a stub delivery provider. Verification tokens are not
printed in logs. Real email provider integration is deferred.

Notification jobs are infrastructure-only stubs. No notification API or product
workflow is added in this phase.

Thumbnail jobs are registered but disabled by default. Existing video uploads
still require uploaded thumbnails, and Cloudinary behavior is unchanged.

Cleanup jobs safely mark expired sessions revoked and expired verification
tokens used. They are idempotent and do not delete active user data.

Failed jobs use structured logs with sanitized errors. Job payloads are not
logged.

## Performance Runtime

Performance improvements are conservative and preserve existing API responses.

Cache environment:

```env
CACHE_ENABLED=true
CACHE_DEFAULT_TTL_SECONDS=60
CACHE_VIDEO_LIST_TTL_SECONDS=60
CACHE_VIDEO_COMMENTS_TTL_SECONDS=30
```

Redis cache keys use the `streamly:` namespace. Cache failures are logged at a
safe level and do not fail API requests.

Cached responses:

```txt
GET /api/v1/videos
GET /api/v1/comments/:videoId without authenticated user context
```

Uncached responses:

```txt
Auth/session routes
Current user routes
Dashboard routes
Video detail route
Authenticated comment reads
Private playlist/account routes
```

Video detail is intentionally not cached because the endpoint increments views
on every request and may include user-specific `isLiked` state.

Invalidation:

```txt
Video create/update/delete/publish clears video list and related comment keys.
Comment create/update/delete clears related comment/list keys.
Like toggles clear affected video/comment list keys.
```

No Redis flush commands are used. Pattern deletes are limited to the
`streamly:` namespace.

Pagination keeps existing `page` and `limit` query parameters. Existing
response pagination shape is unchanged. Cursor pagination is deferred until API
contracts explicitly support it.

Prisma query optimization uses relation counts instead of loading full like and
comment collections for video/comment list responses. Existing response fields
are preserved.

Compression is already enabled for API responses. Express weak ETags remain
available through the framework default; no route-specific ETag contract was
introduced.

## Prisma Commands

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

`DATABASE_URL` must point to PostgreSQL.

## Authorization Runtime

Authorization uses PostgreSQL-backed roles and permissions.

Default roles:

```txt
admin
moderator
creator
user
```

Seed RBAC data after migrations:

```bash
npm run seed:rbac
```

Docker seed command:

```bash
docker compose exec app npm run seed:rbac
```

The seed is idempotent. It creates roles, permissions, role-permission
mappings, and assigns `RBAC_DEFAULT_ROLE` to users without roles.

Optional admin bootstrap:

```env
RBAC_ADMIN_EMAIL=
```

When set, the explicit seed command assigns the `admin` role to that existing
user. The value is optional and is not printed.

## Authentication Runtime

Authentication uses JWT access tokens plus rotating refresh tokens backed by
persistent PostgreSQL sessions. Refresh tokens are hashed before storage.

Existing auth routes remain available:

```txt
POST /api/v1/users/register
POST /api/v1/users/login
POST /api/v1/users/refresh-token
POST /api/v1/users/logout
GET  /api/v1/users/current-user
```

Additional auth route:

```txt
POST /api/v1/users/logout-all
```

Email verification token persistence exists, but no real email delivery is
configured yet. Email sending is deferred to a later jobs/email phase.

## Manual Verification

Check app root:

```bash
curl http://localhost:8000/
```

Check API docs route:

```bash
curl http://localhost:8000/api/v1/docs
```

Check health route:

```bash
curl http://localhost:8000/api/v1/healthcheck
```

Check detailed health route:

```bash
curl http://localhost:8000/api/v1/healthcheck/detailed
```

Check public video list route:

```bash
curl http://localhost:8000/api/v1/videos
```

Check auth routes manually:

```txt
POST /api/v1/users/register
POST /api/v1/users/login
POST /api/v1/users/refresh-token
POST /api/v1/users/logout
GET  /api/v1/users/current-user
```

## Quality Gate

```bash
npm run format
npm run format:check
npm run lint
npm run syntax
npm run smoke
npm run verify:live
npm run verify:docker
npm run verify
npx prisma validate
npx prisma generate
```

`npm run smoke` imports the Express app, checks registered routes, and reports
missing startup environment keys without starting the server or connecting to
PostgreSQL.

`npm run verify` runs formatting, linting, syntax checks, and smoke checks.

## Live Runtime Verification

Create real `.env` first:

```bash
cp .env.example .env
```

Fill PostgreSQL, JWT, and Cloudinary values. Then run:

```bash
npm run verify:live
```

Successful output includes:

```txt
Live verification passed.
PostgreSQL connected: true
Health status code: 200
Registered route handlers: 42
```

`npm run verify:live` starts Express on a temporary local port, checks
`GET /api/v1/healthcheck`, confirms PostgreSQL connection state, verifies route
count, then shuts down cleanly.

## Common Startup Errors

Missing environment variables:

```txt
Startup configuration error
Missing required environment variables: ...
```

Fix: create `.env` from `.env.example` and fill required values.

Invalid PostgreSQL URL:

```txt
PostgreSQL connection FAILED
```

Fix: set `DATABASE_URL` to a valid PostgreSQL connection string.

Prisma client missing:

```txt
@prisma/client did not initialize yet
```

Fix: run `npm run prisma:generate`.

Pending migration:

```txt
The table ... does not exist
```

Fix: run `npm run prisma:migrate`.

Port already in use:

```txt
Port 8000 is already in use
```

Fix: stop existing process or change `PORT`.

Cloudinary upload failures:

```txt
CloudinaryService: Upload failed
```

Fix: verify Cloudinary credentials in `.env`.

## Docker Runtime

Prerequisites:

```txt
Docker Desktop
Docker Compose v2
```

Create Docker environment file:

```bash
cp .env.docker.example .env.docker
```

Fill JWT and Cloudinary placeholders. Keep `DATABASE_URL` pointed at
`postgres`, which is the Docker Compose service hostname. Keep `REDIS_URL`
pointed at `redis`, which is the Redis service hostname.

Start PostgreSQL, Redis, and backend:

```bash
docker compose up --build
```

Docker Compose starts:

```txt
app
worker
postgres
redis
nginx
```

The app container runs:

```bash
npx prisma migrate deploy && npm start
```

This applies existing Prisma migrations before starting Express. It does not
run destructive reset commands.

Seed RBAC after migrations:

```bash
docker compose exec app npm run seed:rbac
```

Check containers:

```bash
docker compose ps
```

View app and Redis logs:

```bash
docker compose logs app
docker compose logs redis
docker compose logs nginx
```

Run Docker verification:

```bash
npm run verify:docker
```

Stop containers:

```bash
docker compose down
```

Useful npm wrappers:

```bash
npm run docker:build
npm run docker:up
npm run docker:down
npm run docker:logs
npm run docker:ps
npm run docker:clean
npm run verify:docker
```

URLs:

```txt
Direct backend:      http://localhost:8000
Nginx proxy:         http://localhost:8080
Direct health:       http://localhost:8000/api/v1/healthcheck
Proxy health:        http://localhost:8080/api/v1/healthcheck
Direct Swagger docs: http://localhost:8000/api/v1/docs
Proxy Swagger docs:  http://localhost:8080/api/v1/docs
Proxy OpenAPI JSON:  http://localhost:8080/api/v1/docs/openapi.json
Planned API host:    http://streamly.zytheran.me
```

## Nginx Reverse Proxy

Phase 13 adds an Nginx reverse proxy for production-style local routing and
prepares the backend for `streamly.zytheran.me`.

Nginx listens on container port `80` and is published locally on port `8080`.
It proxies all requests to the `app` service at `app:8000`. Direct app access
on `http://localhost:8000` remains available for development.

Configured server names:

```txt
localhost
streamly.zytheran.me
```

Proxy headers forwarded to Express:

```txt
Host
X-Real-IP
X-Forwarded-For
X-Forwarded-Host
X-Forwarded-Port
X-Forwarded-Proto
Upgrade
Connection
```

Docker uses:

```env
TRUST_PROXY=1
APP_PUBLIC_BASE_URL=http://streamly.zytheran.me
API_DOCS_SERVER_URL=http://streamly.zytheran.me
```

Upload proxy limit:

```txt
client_max_body_size 100m
```

This is above the current application upload limit and should not reduce
existing upload behavior.

Domain DNS setup is manual. Create this record before expecting the domain to
work:

```txt
Host: streamly
Type: A
Value: SERVER_PUBLIC_IP
TTL: Auto/default
```

If Cloudflare or another DNS provider is used, proxy/CDN can be enabled later.
No DNS provider credentials are used by this project.

HTTPS is intentionally deferred. Until SSL is added, the planned domain is HTTP
only:

```txt
http://streamly.zytheran.me/api/v1/healthcheck
http://streamly.zytheran.me/api/v1/docs
http://streamly.zytheran.me/api/v1/docs/openapi.json
```

Local Host header check:

```bash
curl -H "Host: streamly.zytheran.me" http://localhost:8080/api/v1/healthcheck
```

PostgreSQL debugging:

```txt
Host:     localhost
Port:     5432
Database: streamly
User:     streamly
Password: streamly_password
```

Redis debugging:

```txt
Host: redis
Port: 6379
Docker URL: redis://redis:6379
Local URL:  redis://localhost:6379
```

Common Docker errors:

```txt
Missing .env.docker
```

Fix: copy `.env.docker.example` to `.env.docker`.

```txt
postgres is unhealthy
```

Fix: check `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` match
`DATABASE_URL`.

```txt
redis is unhealthy
```

Fix: verify the `redis` container is running and `REDIS_URL` is
`redis://redis:6379` inside `.env.docker`.

```txt
Authentication failed against database server
```

Fix: recreate local volume after credential changes:

```bash
docker compose down -v
docker compose up --build
```

```txt
port is already allocated
```

Fix: stop the process using `8000`, `8080`, `5432`, or `6379`, or change published
ports.

```txt
502 Bad Gateway
```

Fix: check `docker compose ps`, confirm the `app` container is healthy, then
read `docker compose logs nginx` and `docker compose logs app`.

```txt
413 Request Entity Too Large
```

Fix: confirm Nginx `client_max_body_size` is not lower than the intended upload
size.

```txt
Swagger docs missing
```

Fix: confirm `API_DOCS_ENABLED=true` and check
`http://localhost:8080/api/v1/docs/openapi.json`.

CI/CD, HTTPS automation, and cloud deployment are future phases.
