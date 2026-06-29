# ROLE

You are a Principal Software Architect, Senior Backend Engineer, and Technical Planning Lead.

You are working on the Streamly backend project.

Your task is to create a MASTER IMPLEMENTATION PLAN DOCUMENT that will be used as the single source of truth for all future implementation phases.

This is a planning-only task.

Do NOT implement code changes.

Do NOT refactor application logic.

Do NOT install packages.

Do NOT modify runtime behavior.

---

# CURRENT PROJECT STATUS

The Streamly backend has already completed the following phases:

## Completed Phase 1 — Clean Architecture Refactor

The project was refactored into a clean architecture structure.

Current structure includes:

src/
app.js
index.js
application/services/
core/container/
domain/repositories/
infrastructure/cloudinary/
infrastructure/database/
infrastructure/mongoose/models/
infrastructure/repositories/
presentation/controllers/
presentation/middlewares/
presentation/routes/
shared/constants/
shared/errors/
shared/helpers/
shared/responses/
shared/validators/

Architecture status:

* Presentation calls services.
* Services call repositories.
* Repositories own Mongoose.
* Infrastructure owns Cloudinary.
* Container wires dependencies.
* Existing APIs were preserved.
* Existing route count baseline is 41.
* Existing stack is still Node.js, Express, MongoDB, Mongoose, and Cloudinary.

## Completed Phase 1.5 — Environment Configuration

* `.env.example` created.
* Environment access centralized through `src/config/env.js`.
* Direct scattered `process.env` usage reduced/removed.
* Missing environment variables fail clearly.
* Secrets are not printed.

Detected environment variables:

* PORT
* NODE_ENV
* CORS_ORIGIN
* MONGODB_URI
* ACCESS_TOKEN_SECRET
* ACCESS_TOKEN_EXPIRY
* REFRESH_TOKEN_SECRET
* REFRESH_TOKEN_EXPIRY
* CLOUDINARY_CLOUD_NAME
* CLOUDINARY_API_KEY
* CLOUDINARY_API_SECRET

## Completed Phase 1.6 — Quality Gate

* ESLint config added.
* Syntax check added.
* Smoke check added.
* Verify script added.
* Route count baseline detected: 41.
* `npm run verify` passes.
* App imports safely without starting server.
* Server does not start during smoke import.
* MongoDB does not connect during smoke import.

## Skipped / Deferred

Live runtime verification with MongoDB was not completed because the final target stack will replace MongoDB with PostgreSQL.

Do not spend more effort improving the current MongoDB runtime unless required for safe migration.

---

# FINAL TARGET BACKEND

The final Streamly backend should become a production-grade backend with:

Authentication

* JWT
* Refresh Tokens
* Sessions
* Email Verification

Authorization

* RBAC
* Permissions
* Policies

Architecture

* Clean Architecture
* SOLID
* Repository Pattern
* Dependency Injection
* Domain Driven Structure

Infrastructure

* PostgreSQL
* Prisma
* Redis
* Docker
* Docker Compose
* Nginx

Performance

* Redis Cache
* Pagination
* Cursor Pagination
* Compression
* Query Optimization

Security

* Helmet
* Rate Limiter
* CORS
* CSRF protection where appropriate
* Input Validation
* SQL Injection Prevention
* XSS Protection

Jobs

* BullMQ
* Email Queue
* Thumbnail Generation
* Notifications
* Cleanup Tasks

Logging

* Winston or Pino
* Request IDs
* Error Tracking hooks
* Structured Logs

Testing

* Unit Tests
* Integration Tests
* API Contract Tests

CI/CD

* GitHub Actions
* Lint
* Tests
* Docker Build

Documentation

* Swagger / OpenAPI
* Postman Collection
* Architecture Diagrams
* ER Diagram
* Sequence Diagrams
* README

---

# OBJECTIVE

Create a detailed implementation roadmap document that defines the exact sequence of future phases.

This document will be used before every future Codex prompt.

Each future phase must focus on only one major concern.

The plan must prevent feature creep, duplicated work, breaking APIs, and architecture drift.

---

# REQUIRED OUTPUT FILE

Create:

docs/IMPLEMENTATION_PLAN.md

If `docs/` does not exist, create it.

Do not create multiple planning documents unless absolutely necessary.

---

# PLAN DOCUMENT REQUIREMENTS

The document must include:

## 1. Project Vision

Explain that Streamly is being transformed from a YouTube-style backend clone into a production-grade video platform backend demonstrating enterprise backend engineering.

Focus on:

* Backend architecture
* Scalability
* Security
* Reliability
* Maintainability
* Production readiness
* Recruiter-facing engineering quality

---

## 2. Current State Summary

Document the current completed work:

* Clean architecture done
* Environment config done
* ESLint done
* Syntax check done
* Smoke check done
* Route count baseline: 41
* MongoDB still present
* Cloudinary still present
* PostgreSQL not yet added
* Redis not yet added
* Docker not yet added
* BullMQ not yet added
* Tests not yet added
* Swagger not yet added

---

## 3. Global Rules for Every Phase

Every future implementation phase must follow these rules:

* One major concern per phase.
* No unrelated feature implementation.
* No unnecessary package additions.
* No API breaking changes unless explicitly planned.
* Preserve existing route count unless the phase intentionally adds documented routes.
* Preserve response formats unless the phase explicitly states otherwise.
* Run `npm run verify` after every phase.
* Update documentation after every phase.
* Commit after every successful phase.
* Do not mix infrastructure, auth, security, testing, and documentation in one phase.
* Prefer small, reviewable changes.
* Maintain clean architecture boundaries.
* Keep controllers thin.
* Keep business logic in services/use cases.
* Keep persistence behind repositories.
* Keep infrastructure isolated.
* Keep environment variables centralized.
* Do not print secrets.
* Do not leave temporary files such as `_new`, `_old`, `copy`, `v2`, or `legacy`.

---

## 4. Recommended Git Workflow

Define a simple workflow:

* Create a branch per phase.
* Run verification before commit.
* Use clear commit messages.
* Do not start the next phase until the previous phase passes verification.

Example commit format:

* `refactor: migrate persistence to prisma postgres`
* `feat: add redis session store`
* `feat: add refresh token sessions`
* `feat: add rbac authorization`
* `chore: dockerize production runtime`
* `test: add api contract tests`
* `docs: add architecture diagrams`

---

## 5. Phase Roadmap

Create a detailed sequence of phases.

Use this exact order unless there is a strong technical reason to improve it.

### Phase 2 — PostgreSQL + Prisma Migration

Goal:

Replace MongoDB/Mongoose persistence with PostgreSQL and Prisma while preserving existing API behavior.

Scope:

* Add Prisma
* Add PostgreSQL schema
* Replace Mongoose models with Prisma models
* Implement Prisma repositories
* Preserve repository contracts
* Preserve services
* Preserve controllers
* Preserve API responses
* Preserve existing routes
* Add migrations
* Add seed script only if useful

Out of scope:

* Redis
* Docker
* New auth features
* RBAC
* BullMQ
* Swagger
* Full testing framework
* New APIs

Success criteria:

* MongoDB removed from runtime
* PostgreSQL works locally
* Existing APIs behave the same
* `npm run verify` passes
* Route count baseline remains explainable

---

### Phase 3 — Docker + Docker Compose + PostgreSQL Runtime

Goal:

Containerize the new PostgreSQL-based backend runtime.

Scope:

* Dockerfile
* `.dockerignore`
* docker-compose.yml
* App service
* PostgreSQL service
* Optional pgAdmin only if safe
* Docker env example
* Healthcheck
* Docker verification script

Out of scope:

* Redis
* Nginx
* BullMQ
* CI/CD
* Swagger
* New APIs

Success criteria:

* `docker compose up --build` works
* App connects to PostgreSQL through Docker network
* Health route works
* No secrets committed

---

### Phase 4 — Authentication Upgrade

Goal:

Implement production-grade authentication.

Scope:

* JWT access tokens
* Refresh tokens
* Refresh token rotation
* Secure token storage strategy
* Session table/model
* Logout
* Logout all devices
* Password reset if current project supports auth email flow
* Email verification if email infrastructure is ready or safely stubbed

Out of scope:

* RBAC
* Redis
* BullMQ
* Full email queue
* Swagger
* CI/CD

Success criteria:

* Existing auth behavior remains compatible where possible
* Sessions are persisted
* Refresh flow works
* Token invalidation works
* Secrets remain centralized

---

### Phase 5 — Redis Infrastructure

Goal:

Introduce Redis as infrastructure.

Scope:

* Redis connection module
* Redis health check
* Redis Docker service
* Redis env config
* Redis adapter abstraction
* Use Redis only for infrastructure readiness initially

Out of scope:

* Caching business endpoints
* BullMQ
* Rate limiter storage
* Session migration unless explicitly included in later phase

Success criteria:

* App connects to Redis
* Redis is optional/fails clearly in development
* Docker Compose includes Redis
* No unrelated features added

---

### Phase 6 — Authorization: RBAC, Permissions, Policies

Goal:

Implement enterprise authorization.

Scope:

* Roles
* Permissions
* User-role mapping
* Policy functions
* Ownership checks
* Authorization middleware
* Admin/moderator/user permission model
* Database schema updates
* Seed default roles/permissions

Out of scope:

* Redis
* BullMQ
* Swagger
* UI
* New product features

Success criteria:

* Protected routes enforce permissions
* Ownership policies work
* Existing users can be assigned default roles
* Authorization is testable and centralized

---

### Phase 7 — Security Hardening

Goal:

Add production-grade security middleware and practices.

Scope:

* Helmet
* CORS review
* Rate limiting
* Input validation cleanup
* Sanitization
* XSS protection
* CSRF decision and implementation where appropriate
* Secure cookies if cookies are used
* Trusted proxy settings
* Security headers

Out of scope:

* RBAC changes
* Auth redesign
* Redis caching
* BullMQ
* Swagger

Success criteria:

* Security middleware order is correct
* Existing API behavior is preserved
* Security config is environment-aware
* No secrets exposed

---

### Phase 8 — Logging and Observability Foundation

Goal:

Add structured production logging.

Scope:

* Winston or Pino
* Request IDs
* Correlation IDs
* HTTP request logs
* Error logs
* Audit logs for sensitive operations
* Replace console logging
* Environment-based log levels

Out of scope:

* External paid monitoring services
* Full distributed tracing
* CI/CD
* Swagger

Success criteria:

* Logs are structured
* Request IDs appear in logs
* Errors are logged consistently
* Secrets are never logged

---

### Phase 9 — BullMQ Jobs

Goal:

Introduce background jobs.

Scope:

* BullMQ
* Redis-backed queues
* Email queue
* Notification queue
* Thumbnail generation queue
* Cleanup queue
* Retry strategy
* Failed job handling
* Worker process structure

Out of scope:

* Full notification product redesign
* New frontend
* CI/CD
* Swagger

Success criteria:

* Workers run separately from API
* Jobs retry safely
* Failed jobs are observable
* No blocking work remains in request lifecycle where jobs are appropriate

---

### Phase 10 — Performance Improvements

Goal:

Improve API performance safely.

Scope:

* Redis caching
* Cursor pagination
* Compression
* ETags where appropriate
* Query optimization
* Database indexes
* Avoid N+1 queries
* Response size review

Out of scope:

* New business features
* Auth redesign
* RBAC redesign

Success criteria:

* Pagination is consistent
* Heavy queries are optimized
* Caching has invalidation strategy
* Performance changes are documented

---

### Phase 11 — Testing Foundation

Goal:

Add proper tests.

Scope:

* Unit tests
* Integration tests
* API contract tests
* Repository tests
* Service tests
* Test database strategy
* Test fixtures/factories
* Coverage script

Out of scope:

* CI/CD
* Swagger
* New features

Success criteria:

* Tests can run locally
* API contract tests protect response formats
* Repositories/services are testable
* Coverage is reported

---

### Phase 12 — Swagger / OpenAPI Documentation

Goal:

Add API documentation.

Scope:

* OpenAPI spec
* Swagger UI
* Auth docs
* Request/response schemas
* Error schemas
* Example payloads
* Postman collection export if useful

Out of scope:

* New APIs
* Auth redesign
* Database changes

Success criteria:

* Docs match actual APIs
* Protected routes are documented
* Response schemas are accurate
* README links to API docs

---

### Phase 13 — Nginx Reverse Proxy

Goal:

Prepare for hosted URLs and production-style routing.

Scope:

* Nginx service
* Reverse proxy config
* Local proxy port
* Production-ready headers
* Health route forwarding
* Docker Compose integration

Out of scope:

* SSL certificates
* Domain setup
* Cloud deployment
* CI/CD

Success criteria:

* API works through Nginx locally
* Health route works through Nginx
* App still works directly in development

---

### Phase 14 — CI/CD with GitHub Actions

Goal:

Add automated verification.

Scope:

* Lint workflow
* Format check
* Syntax check
* Tests
* Docker build
* Prisma migration validation
* Pull request checks

Out of scope:

* Cloud deployment
* Secrets deployment
* Kubernetes

Success criteria:

* GitHub Actions pass on push/PR
* Docker image builds
* Tests run in CI
* No secrets committed

---

### Phase 15 — Final Documentation and Architecture Showcase

Goal:

Make the repository recruiter-ready and portfolio-ready.

Scope:

* README rewrite
* Architecture diagrams
* ER diagram
* Sequence diagrams
* Deployment guide
* Environment guide
* System design notes
* Trade-offs
* Future improvements
* Screenshots/examples
* Postman collection
* API examples

Out of scope:

* New backend features
* Major code changes

Success criteria:

* GitHub repository looks production-grade
* Architecture is easy to understand
* Recruiters can evaluate the project quickly
* Engineers can run the project locally

---

## 6. Phase Dependency Map

Document dependencies clearly.

Example:

* PostgreSQL must happen before Docker final runtime.
* Docker must happen before Redis/BullMQ runtime becomes stable.
* Redis must happen before BullMQ.
* Auth should happen before RBAC.
* RBAC should happen before detailed security policy enforcement.
* Logging should happen before jobs and performance work.
* Testing should happen before final CI/CD.
* Swagger should happen after API contracts stabilize.

---

## 7. Verification Checklist for Every Phase

Every phase must end with:

* `npm run format`
* `npm run format:check`
* `npm run lint`
* `npm run syntax`
* `npm run smoke`
* `npm run verify`
* Additional phase-specific checks
* Manual check where required
* README/docs update
* Clear final report

---

## 8. Phase Prompt Template

Add a reusable template that will be used for every future Codex prompt.

The template should include:

* Role
* Current state
* Phase objective
* Scope
* Out of scope
* Files allowed to change
* Restrictions
* Backward compatibility requirements
* Environment rules
* Package rules
* Verification commands
* Final output requirements

---

## 9. Risk Register

Document major risks:

* Breaking existing API response formats
* Changing auth behavior accidentally
* Prisma schema mismatch
* Data migration complexity
* Docker env mismatch
* Redis becoming mandatory too early
* RBAC overengineering
* Rate limiting breaking development
* BullMQ worker lifecycle issues
* Tests depending on real external services
* Swagger drifting from implementation
* CI failures due to missing secrets

For each risk, include mitigation.

---

## 10. Definition of Done

Define a strict definition of done for every phase:

* Scope completed
* Out-of-scope items not touched
* Verification passed
* Docs updated
* No secrets committed
* No temporary files
* No broken imports
* No route regressions
* No unexplained route count changes
* Final report produced

---

# IMPORTANT PLANNING DECISIONS

Use the following decisions:

1. Do not Dockerize the old MongoDB runtime.
2. PostgreSQL + Prisma migration is the next implementation phase after this planning document.
3. Docker should be implemented after PostgreSQL so Docker represents the target stack.
4. Redis should be introduced after Docker.
5. BullMQ should be introduced after Redis.
6. RBAC should be implemented after authentication is stable.
7. CI/CD should come after tests exist.
8. Final documentation should come after architecture stabilizes.

---

# OUTPUT REQUIREMENTS

After creating `docs/IMPLEMENTATION_PLAN.md`, provide:

1. File created
2. Summary of the roadmap
3. Next implementation phase
4. Why this phase order was chosen
5. Any assumptions made
6. Any open questions

Do not implement any phase yet.

Only create the planning document.
