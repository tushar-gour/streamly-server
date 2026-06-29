# Changelog

All notable changes to Streamly are documented here.

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
- Added email, notification, cleanup, thumbnail placeholder, and verification
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
- HTTPS automation is deferred.
- Real email delivery is deferred.
- Thumbnail processing is a placeholder.
- External monitoring is not integrated.
- Dependency advisories remain reported by audit tooling.
