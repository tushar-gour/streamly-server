# Contributing

Streamly is a portfolio backend project. Keep changes scoped, verified, and
architecture-aligned.

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run seed:rbac
```

## Branching

Use focused branches:

```txt
feature/<short-scope>
fix/<short-scope>
docs/<short-scope>
chore/<short-scope>
```

Do not mix unrelated concerns.

## Commit Style

Use conventional commit prefixes:

```txt
feat:
fix:
docs:
test:
refactor:
chore:
ci:
```

## Architecture Rules

- Keep controllers thin.
- Keep business logic in application services.
- Keep persistence behind repositories.
- Keep Prisma inside infrastructure.
- Keep external services behind adapters.
- Avoid circular dependencies.
- Preserve API response compatibility.

## Checks

Run before opening a pull request:

```bash
npm run format
npm run format:check
npm run lint
npm run syntax
npm run smoke
npm run verify
npm test
npm run docs:validate
npx prisma validate
npx prisma generate
```

Docker checks when Docker is available:

```bash
docker compose config
npm run verify:docker
npm run verify:jobs
```

## Tests

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:api
npm run test:coverage
```

Database-backed integration tests are guarded and skipped by default. Enable
them only with a dedicated test database.

## Secret Safety

Never commit:

- `.env`
- `.env.docker`
- JWT secrets
- database passwords
- Redis credentials
- Cloudinary secrets
- tokens
- cookies
- logs containing secrets

## Pull Request Expectations

Include:

- summary
- scope
- verification commands
- migration notes if Prisma changes
- API compatibility notes if routes or responses change
- screenshots only for documentation/UI artifacts when useful

Deployment, cloud infrastructure, and SSL automation are intentionally out of
scope unless a dedicated phase explicitly covers them.
