# Streamly Deployment Preparation

This repository prepares Streamly for production-style deployment but does not
perform cloud provisioning, DNS automation, certificate renewal automation, or
deployment automation.

## Current Deployment-Ready Shape

- Dockerfile for the API and worker image.
- Docker Compose runtime with app, worker, PostgreSQL, Redis, and Nginx.
- Prisma migrations.
- Healthcheck routes.
- Nginx reverse proxy.
- GitHub Actions CI.
- OpenAPI documentation.
- TypeScript production build to `dist/`.
- AWS-ready production environment template.
- Owner-confirmed HTTPS domain: `https://streamly.zytheran.me`.

## Production Domain

```txt
https://streamly.zytheran.me
```

Production HTTPS URLs:

```txt
https://streamly.zytheran.me/api/v1/healthcheck
https://streamly.zytheran.me/api/v1/docs
https://streamly.zytheran.me/api/v1/docs/openapi.json
```

## DNS

The owner has confirmed DNS for the current production domain. For a future
server move, use this A record pattern:

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

## HTTPS Status

HTTPS is owner-confirmed for `streamly.zytheran.me`. This repository still does
not automate Certbot, Let's Encrypt, certificate renewal, or redirect policy.

## Production Environment Checklist

Set production-safe values for:

- `NODE_ENV=production`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
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
- `MEDIA_STORAGE_PROVIDER`
- `VIDEO_STREAMING_ENABLED`
- `EMAIL_ENABLED`
- `EMAIL_PROVIDER`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `SMS_ENABLED`
- `SMS_PROVIDER`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `THUMBNAIL_GENERATION_ENABLED`
- `AWS_REGION`
- `AWS_S3_BUCKET`

Leave `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` empty on EC2 when an IAM
role with S3 access is attached.

Do not use placeholder secrets in production.

Start from:

```bash
cp .env.production.example .env.production
```

Then copy real values manually on the production host. Do not commit the real
file.

## Video Streaming

The API exposes:

```txt
GET /api/v1/videos/{videoId}/stream
```

The endpoint supports HTTP Range requests for large video playback and proxies
trusted stored media URLs. Nginx forwards Range and If-Range headers and keeps
proxy buffering disabled for streaming behavior.

## Email, SMS, And Thumbnails

- Email verification jobs use Twilio SendGrid when `EMAIL_ENABLED=true` and
  `EMAIL_PROVIDER=sendgrid`.
- SMS notification infrastructure uses Twilio when `SMS_ENABLED=true` and
  `SMS_PROVIDER=twilio`.
- Thumbnail jobs generate ffmpeg-extracted 16:9 thumbnails for S3 media when
  `THUMBNAIL_GENERATION_ENABLED=true`.
- Tests and CI use no-op providers and never call real providers.

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

Production domain:

```bash
curl https://streamly.zytheran.me/api/v1/healthcheck
```

## Swagger Verification

```bash
curl http://localhost:8080/api/v1/docs/openapi.json
```

Production domain:

```bash
curl https://streamly.zytheran.me/api/v1/docs/openapi.json
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
- DNS provider configuration.
- Certificate renewal automation.
- Backups.
- External monitoring.
- Blue-green or canary deployment.
