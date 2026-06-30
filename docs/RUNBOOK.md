# Streamly Runbook

Operational guide for local development, Docker runtime, verification, and
common failures.

## Start Locally

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run build
npm run prisma:migrate
npm run seed:rbac
npm start
```

Development mode:

```bash
npm run dev
```

## Start With Docker

```bash
cp .env.docker.example .env.docker
docker compose up --build
```

Services:

- app
- worker
- postgres
- redis
- nginx

## Stop Services

```bash
docker compose down
```

Stop and remove volumes only when intentionally resetting local data:

```bash
docker compose down -v
```

## Logs

```bash
docker compose logs app
docker compose logs worker
docker compose logs nginx
docker compose logs postgres
docker compose logs redis
```

Follow logs:

```bash
docker compose logs -f app
```

## Prisma

Generate client:

```bash
npm run prisma:generate
```

Apply local development migration:

```bash
npm run prisma:migrate
```

Apply deployed migrations in Docker:

```bash
docker compose exec app npx prisma migrate deploy
```

Open Studio:

```bash
npm run prisma:studio
```

## RBAC Seed

Local:

```bash
npm run seed:rbac
```

Docker:

```bash
docker compose exec app npm run seed:rbac
```

The seed is idempotent.

## Worker

Local worker:

```bash
npm run jobs:worker
```

Verify jobs:

```bash
npm run verify:jobs
```

Docker worker:

```bash
docker compose ps worker
docker compose logs worker
```

## Nginx Proxy

Local proxy:

```txt
http://localhost:8080
```

Health through proxy:

```bash
curl http://localhost:8080/api/v1/healthcheck
```

Swagger through proxy:

```bash
curl http://localhost:8080/api/v1/docs/openapi.json
```

Domain host header check:

```bash
curl -H "Host: streamly.zytheran.me" http://localhost:8080/api/v1/healthcheck
```

## Verification

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run build
npm run syntax
npm run smoke
npm run verify
npm test
npm run test:unit
npm run test:integration
npm run test:api
npm run test:coverage
npm run docs:validate
npx prisma validate
npx prisma generate
docker compose config
npm run verify:docker
npm run verify:jobs
```

## Troubleshooting

### Docker daemon unavailable

Symptom:

```txt
Cannot connect to the Docker daemon
```

Fix:

- Start Docker Desktop.
- Run `docker version`.
- Run `docker compose ps`.

### PostgreSQL connection failed

Check:

- `DATABASE_URL`
- container health
- username and password
- database name

Commands:

```bash
docker compose ps postgres
docker compose logs postgres
```

### Redis connection failed

Check:

- `REDIS_ENABLED`
- `REDIS_URL`
- Redis container health

Commands:

```bash
docker compose ps redis
docker compose logs redis
```

### Nginx 502

Cause: Nginx cannot reach the app service.

Fix:

```bash
docker compose ps
docker compose logs nginx
docker compose logs app
```

Confirm app health:

```bash
curl http://localhost:8000/api/v1/healthcheck
```

### Prisma generate or validate fails

Check `DATABASE_URL` exists, then run:

```bash
npx prisma validate
npx prisma generate
```

On Windows, `prisma generate` may fail if the query engine file is locked. Wait
for running tests or Node processes to exit, then retry.

### S3 media configuration

If uploads fail, verify:

- `MEDIA_STORAGE_PROVIDER=s3`
- `AWS_REGION`
- `AWS_S3_BUCKET`

On EC2, leave `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` empty when an IAM
role with S3 access is attached.

### Rate limit issues

For local tests:

```env
DISABLE_RATE_LIMITING_IN_TEST=true
```

For development, raise local limits through:

- `RATE_LIMIT_MAX`
- `AUTH_RATE_LIMIT_MAX`

### Worker issues

Check:

```bash
docker compose logs worker
npm run verify:jobs
```

Verify Redis is healthy before starting workers.

### GitHub Actions failures

Read failed job logs:

```bash
gh run list
gh run view --log
```

Common causes:

- format drift
- lint error
- missing env placeholder
- Prisma schema error
- Docker build failure
- OpenAPI documentation drift
