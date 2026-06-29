# Streamly Testing

Streamly uses Vitest and Supertest for a lightweight testing foundation.

## Commands

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:api
npm run test:coverage
```

## Test Types

| Type | Location | Purpose |
| --- | --- | --- |
| Unit | `tests/unit` | Helpers, cache keys, redaction, fail-open behavior |
| Service | `tests/services` | Authorization, policy, video service behavior with mocks |
| API contract | `tests/api` | HTTP responses and error shapes through Express app |
| Integration | `tests/integration` | Prisma repository behavior with guarded test DB |
| Factories | `tests/factories` | Test data builders |
| Helpers | `tests/helpers` | Test database guards |

## Environment Strategy

`tests/setup/test-env.js` sets safe defaults:

- `NODE_ENV=test`
- test JWT secrets
- Redis disabled
- jobs disabled
- rate limiting disabled
- Cloudinary mocked
- test database URL fallback

No test requires real Cloudinary credentials or real email delivery.

## Test Database Strategy

Database tests are guarded and skipped by default.

Enable them only with both:

```bash
RUN_DATABASE_TESTS=true
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamly_test?schema=public
```

Safety rule:

```txt
Database URL must include test or streamly_test.
```

Prepare the database:

```bash
createdb streamly_test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamly_test?schema=public npx prisma migrate deploy
```

Run guarded integration tests:

```bash
RUN_DATABASE_TESTS=true TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamly_test?schema=public npm run test:integration
```

## Redis Testing

- Unit tests mock Redis/cache behavior.
- API tests run with Redis disabled.
- Integration tests may use Redis only when explicitly configured.
- Tests do not flush global Redis state.

## External Services

Cloudinary:

- mocked by default in tests
- no real upload required

Email:

- delivery provider is stubbed
- no real email is sent

BullMQ:

- worker is not started by the base suite
- job verification is separate through `npm run verify:jobs`

## API Contract Coverage

API tests cover:

- health route
- public video route
- protected current-user without token
- malformed JSON
- oversized payload
- login failure
- docs route when enabled

## Coverage

```bash
npm run test:coverage
```

Coverage output:

```txt
coverage/
```

No hard threshold is enforced yet. Current coverage is a baseline, not a final
quality target.

## CI Behavior

GitHub Actions runs:

- full Vitest suite
- unit tests
- API tests
- integration command with guarded DB tests skipped
- coverage command

CI does not provision a live test database in this phase.
