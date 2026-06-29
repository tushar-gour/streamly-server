# Streamly Deployment Preparation

This repository prepares Streamly for production-style deployment but does not
perform cloud provisioning, DNS automation, HTTPS setup, or deployment
automation.

## Current Deployment-Ready Shape

- Dockerfile for the API and worker image.
- Docker Compose runtime with app, worker, PostgreSQL, Redis, and Nginx.
- Prisma migrations.
- Healthcheck routes.
- Nginx reverse proxy on HTTP.
- GitHub Actions CI.
- OpenAPI documentation.

## Planned Domain

```txt
streamly.zytheran.me
```

Planned HTTP URLs:

```txt
http://streamly.zytheran.me/api/v1/healthcheck
http://streamly.zytheran.me/api/v1/docs
http://streamly.zytheran.me/api/v1/docs/openapi.json
```

## DNS

Create an A record before expecting the domain to resolve:

```txt
Host: streamly
Type: A
Value: SERVER_PUBLIC_IP
TTL: Auto/default
```

Do not commit provider credentials or real server IPs.

## Nginx Behavior

Nginx listens on port `80` in the container and proxies all requests to
`app:8000`.

Server names:

```txt
localhost
streamly.zytheran.me
```

Forwarded headers:

- Host
- X-Real-IP
- X-Forwarded-For
- X-Forwarded-Host
- X-Forwarded-Port
- X-Forwarded-Proto
- Upgrade
- Connection

Upload proxy limit:

```txt
client_max_body_size 100m
```

## HTTPS Deferred

HTTPS, Certbot, Let's Encrypt, certificate renewal, and redirect policy are not
implemented. Until SSL is configured in a future deployment phase, the planned
domain is HTTP only.

## Production Environment Checklist

Set production-safe values for:

- `NODE_ENV=production`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CORS_ORIGIN`
- `CORS_CREDENTIALS`
- `TRUST_PROXY`
- `COOKIE_SECURE`
- `COOKIE_SAME_SITE`
- `APP_PUBLIC_BASE_URL`
- `API_DOCS_SERVER_URL`
- `LOG_LEVEL`
- `RATE_LIMIT_MAX`
- `AUTH_RATE_LIMIT_MAX`

Do not use placeholder secrets in production.

## Migration Checklist

1. Configure production `DATABASE_URL`.
2. Build image.
3. Run Prisma migrations:

```bash
npx prisma migrate deploy
```

4. Start API.
5. Run healthcheck.
6. Run RBAC seed if roles and permissions are missing.

## RBAC Seed Checklist

```bash
npm run seed:rbac
```

Optional admin promotion:

```env
RBAC_ADMIN_EMAIL=
```

Only set this for an existing trusted user during an explicit seed operation.

## Health Verification

Direct app:

```bash
curl http://localhost:8000/api/v1/healthcheck
```

Nginx:

```bash
curl http://localhost:8080/api/v1/healthcheck
```

Domain after DNS:

```bash
curl http://streamly.zytheran.me/api/v1/healthcheck
```

## Swagger Verification

```bash
curl http://localhost:8080/api/v1/docs/openapi.json
```

After DNS:

```bash
curl http://streamly.zytheran.me/api/v1/docs/openapi.json
```

## Rollback Notes

- Keep previous image tag before deployment.
- Keep database backups before migrations.
- Roll back app image first.
- Database rollback requires migration-specific planning.
- Do not run `prisma migrate reset` in production.

## Not Automated Yet

- Cloud server provisioning.
- SSH deployment.
- Docker registry publishing.
- HTTPS certificates.
- DNS provider configuration.
- Backups.
- External monitoring.
- Blue-green or canary deployment.
