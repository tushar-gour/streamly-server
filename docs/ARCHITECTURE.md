# Streamly Architecture

Streamly uses clean architecture to keep business rules independent from
framework, database, queue, and storage details.

## Goals

- Keep controllers thin.
- Keep business workflows in application services.
- Keep persistence behind repository contracts.
- Keep infrastructure replaceable.
- Preserve existing API behavior.
- Support future deployment and scaling work.

## Layer Responsibilities

| Layer | Responsibility |
| --- | --- |
| Presentation | Express routes, middleware, controllers, request parsing, responses |
| Application | Use-case orchestration, auth workflows, caching decisions, job enqueueing |
| Domain | Repository contracts and core authorization concepts |
| Infrastructure | Prisma, PostgreSQL, Redis, BullMQ, S3 media, Pino, adapters |
| Core | Dependency composition and container wiring |
| Shared | API responses, errors, validators, constants, helpers |

## Dependency Direction

```mermaid
flowchart TD
    Presentation["Presentation layer"] --> Application["Application services"]
    Application --> Domain["Domain contracts"]
    Infrastructure["Infrastructure implementations"] --> Domain
    Container["Composition root"] --> Presentation
    Container --> Application
    Container --> Infrastructure
```

Rules:

- Controllers do not import Prisma.
- Services do not depend on Express response objects.
- Repositories do not contain HTTP logic.
- Infrastructure owns external libraries.
- The container wires concrete implementations.

## Folder Structure

```txt
src/
  app.ts
  index.ts
  application/services/
  config/
  core/container/
  domain/repositories/
  infrastructure/
    cache/
    cloudinary/ legacy fallback
    database/
    jobs/
    logger/
    redis/
    repositories/
  presentation/
    controllers/
    middlewares/
    routes/
  shared/
  workers/
```

## Runtime Topology

```mermaid
flowchart LR
    Browser["Client or API tool"] --> Nginx["Nginx :8080"]
    Nginx --> App["Express app :8000"]
    App --> Postgres["PostgreSQL"]
    App --> Redis["Redis"]
    App --> S3["AWS S3"]
    App --> Queues["BullMQ queues"]
    Worker["Worker process"] --> Queues
    Worker --> Redis
    Worker --> Postgres
```

## Request Lifecycle

```mermaid
sequenceDiagram
    participant Client
    participant Nginx
    participant Express
    participant Middleware
    participant Controller
    participant Service
    participant Repository
    participant PostgreSQL

    Client->>Nginx: HTTP request
    Nginx->>Express: Forward with proxy headers
    Express->>Middleware: Security, auth, request id
    Middleware->>Controller: Valid request context
    Controller->>Service: Application input
    Service->>Repository: Repository contract call
    Repository->>PostgreSQL: Prisma query
    PostgreSQL-->>Repository: Data
    Repository-->>Service: Mapped API-compatible data
    Service-->>Controller: Result
    Controller-->>Client: ApiResponse or ApiError
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant AuthService
    participant TokenService
    participant SessionRepository
    participant PostgreSQL

    Client->>AuthController: Login credentials
    AuthController->>AuthService: login
    AuthService->>TokenService: create access and refresh token
    TokenService-->>AuthService: raw tokens and refresh hash
    AuthService->>SessionRepository: create session with token hash
    SessionRepository->>PostgreSQL: insert session
    AuthService-->>AuthController: tokens and user
    AuthController-->>Client: response and cookies
```

Refresh token rotation:

```mermaid
sequenceDiagram
    participant Client
    participant AuthService
    participant TokenService
    participant SessionRepository

    Client->>AuthService: refresh token
    AuthService->>TokenService: verify refresh token
    AuthService->>SessionRepository: find valid matching session
    AuthService->>TokenService: create replacement refresh token
    AuthService->>SessionRepository: store new refresh token hash
    AuthService-->>Client: new access and refresh token
```

## Authorization Flow

```mermaid
flowchart TD
    Request["Authenticated request"] --> Permission["Permission middleware"]
    Permission --> UserPerms["Load user permissions"]
    UserPerms --> HasAny{"Has any permission?"}
    HasAny -->|Yes| Allow["Allow"]
    HasAny -->|No| Ownership["Ownership policy"]
    Ownership --> IsOwner{"Owns resource?"}
    IsOwner -->|Yes| Allow
    IsOwner -->|No| Deny["403 forbidden"]
```

RBAC uses roles, permissions, user-role mappings, and role-permission mappings.
Ownership checks stay centralized in the policy service.

## Background Job Flow

```mermaid
sequenceDiagram
    participant Service
    participant Producer
    participant Redis
    participant Worker
    participant Processor

    Service->>Producer: enqueue job
    Producer->>Redis: add BullMQ job
    Redis-->>Worker: job available
    Worker->>Processor: process job
    Processor-->>Worker: result or sanitized error
```

Current queues support email verification, notifications, cleanup, S3 thumbnail
generation, and job health verification. Email delivery uses Twilio
SendGrid when configured, while SMS notification infrastructure uses Twilio
when enabled.

## Cache Flow

```mermaid
flowchart TD
    Read["Read request"] --> CacheKey["Build streamly namespaced key"]
    CacheKey --> Hit{"Redis hit?"}
    Hit -->|Yes| ReturnCached["Return cached response"]
    Hit -->|No| Query["Query PostgreSQL"]
    Query --> Store["Store with TTL"]
    Store --> ReturnFresh["Return fresh response"]
    Mutation["Mutation"] --> Invalidate["Delete affected streamly keys"]
```

The cache fails open. Redis errors are logged safely and do not break API
requests.

## Logging And Request Context

Every request gets:

- request id
- correlation id
- structured HTTP log
- sanitized error log when errors occur

Pino writes JSON to stdout for Docker-friendly operation. Redaction protects
tokens, cookies, passwords, secret keys, token hashes, and connection strings.

## Docker Compose Topology

```mermaid
flowchart LR
    Nginx["nginx"] --> App["app"]
    App --> Postgres["postgres"]
    App --> Redis["redis"]
    Worker["worker"] --> Postgres
    Worker --> Redis
```

Services:

- `app`: Express API and Prisma migrations on startup.
- `worker`: BullMQ worker runtime.
- `postgres`: PostgreSQL 16.
- `redis`: Redis 7.
- `nginx`: HTTP reverse proxy.

## Technology Decisions

| Technology | Reason |
| --- | --- |
| PostgreSQL | Relational data, constraints, joins, production familiarity |
| Prisma | Typed schema, migrations, clean repository implementation |
| Redis | Cache and BullMQ infrastructure |
| BullMQ | Durable Redis-backed background jobs |
| Nginx | Production-style reverse proxy and hosted URL preparation |
| Pino | Fast structured JSON logging |
| Vitest and Supertest | Lightweight unit and API verification |
| OpenAPI | Accurate API documentation and client-facing contract |

## Boundaries Preserved

- API route count is now `52` after adding video streaming and auth-platform routes.
- Runtime source is TypeScript and builds to `dist/`.
- Public API response style is preserved.
- S3 media behavior is adapter-based.
- Smoke import does not start server or connect external services.
- Worker runtime does not start Express.
