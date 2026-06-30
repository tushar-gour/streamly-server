# Changelog

All notable changes to Streamly are documented here.

## [1.3.0] - 2026-06-30

### Added

- Added AWS S3 media provider with upload, delete, and Range streaming support.
- Added Cloudflare Turnstile provider and Redis-backed smart captcha risk state.
- Added OTP challenge persistence for email, SMS, and WhatsApp flows.
- Added authenticator-app MFA persistence, challenge records, and trust tokens.
- Added Twilio WhatsApp notification provider infrastructure.
- Added staged auth-platform signup and login routes.
- Added Prisma migration for phone verification, OTP challenges, MFA methods,
  MFA challenges, and MFA trust tokens.

### Changed

- Updated production env template for AWS EC2/S3/RDS, Upstash Redis, Twilio,
  SendGrid, Cloudflare Turnstile, OTP, and MFA.
- Updated OpenAPI route documentation and route baseline to 52 handlers.
- Kept Cloudinary as local fallback while enabling S3 as production media
  provider.

## [1.2.0] - 2026-06-30

### Added

- Added Twilio SendGrid email provider with safe no-op fallback.
- Added Twilio SMS provider infrastructure with masked recipient logging.
- Added Cloudinary thumbnail generation pipeline for video jobs.
- Added proprietary all-rights-reserved license posture.
- Updated production environment templates for HTTPS domain, SendGrid, Twilio,
  thumbnail generation, and AWS-ready manual deployment.

### Changed

- Updated docs to reflect owner-confirmed HTTPS domain:
  `https://streamly.zytheran.me`.
- Removed completed email and thumbnail items from known limitations.
- Changed package metadata license from `ISC` to `UNLICENSED`.

## [1.1.0] - 2026-06-29

### TypeScript

- Migrated runtime source and tests from JavaScript files to TypeScript files.
- Added TypeScript config, typecheck script, and production build script.
- Updated Docker and CI to build and verify TypeScript.

### Video Streaming

- Added `GET /api/v1/videos/{videoId}/stream`.
- Added HTTP Range request support for large video playback.
- Added `206 Partial Content` and `416 Range Not Satisfiable` handling.
- Added trusted media streaming provider abstraction for Cloudinary-compatible
  URLs.
- Updated OpenAPI and Postman documentation.

### Production Preparation

- Added `.env.production.example`.
- Added media storage and AWS/S3 readiness placeholders.
- Updated environment, deployment, runbook, API, and architecture docs.

## [1.0.0] - 2026-06-29

### Architecture

- Refactored backend into clean architecture layers.
- Added explicit presentation, application, domain, infrastructure, shared, and
  composition boundaries.
- Introduced repository contracts and dependency wiring.

### Database

- Migrated runtime persistence from MongoDB/Mongoose to PostgreSQL and Prisma.
- Added Prisma schema and migrations.
- Preserved MongoDB-style external response compatibility where practical.

### Authentication

- Added JWT access tokens.
- Added refresh token rotation.
- Added persistent PostgreSQL sessions.
- Stored refresh tokens as hashes.
- Added logout current session and logout all sessions.
- Added email verification token infrastructure.

### Authorization

- Added RBAC roles and permissions.
- Added user-role and role-permission mappings.
- Added ownership policies.
- Added idempotent RBAC seed script.

### Security

- Added Helmet.
- Hardened CORS configuration.
- Added global and auth route rate limiting.
- Added request sanitization.
- Added body size limits.
- Added trusted proxy and secure cookie configuration.
- Documented CSRF decision.

### Logging

- Added Pino structured logging.
- Added request IDs and correlation IDs.
- Added HTTP request logging.
- Added sanitized error logging.
- Added audit logging foundation.
- Added sensitive data redaction.

### Jobs

- Added BullMQ queue infrastructure.
- Added separate worker runtime.
- Added email, notification, cleanup, thumbnail, and verification
  queues.
- Added job verification script.

### Performance

- Added Redis cache abstraction.
- Added safe public endpoint caching.
- Added namespace-scoped cache invalidation.
- Added conservative Prisma query improvements.

### Testing

- Added Vitest and Supertest.
- Added unit, service, API contract, and guarded integration tests.
- Added coverage command.
- Added fixtures and test helpers.

### Documentation

- Added OpenAPI 3.1 document.
- Added Swagger UI route.
- Added Postman collection.
- Added architecture, system design, security, runbook, deployment,
  environment, API, and testing documentation.

### Docker And Nginx

- Added Dockerfile.
- Added Docker Compose runtime with app, worker, PostgreSQL, Redis, and Nginx.
- Added Nginx reverse proxy for local Docker and `streamly.zytheran.me`
  preparation.

### CI/CD

- Added GitHub Actions CI workflow.
- Added quality, tests, OpenAPI, Prisma, and Docker build jobs.
- Kept deployment and registry publishing out of scope.

### Known Limitations

- No live cloud deployment is claimed.
- Certificate renewal automation is deferred.
- Production provider credentials are owner-managed.
- External monitoring is not integrated.
- Dependency advisories remain reported by audit tooling.
