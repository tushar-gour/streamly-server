# Streamly Documentation

Documentation index for the Streamly backend.

## Core Docs

- [Architecture](ARCHITECTURE.md)
- [System Design](SYSTEM_DESIGN.md)
- [Security](SECURITY.md)
- [Runbook](RUNBOOK.md)
- [Deployment Preparation](DEPLOYMENT.md)
- [Environment Variables](ENVIRONMENT.md)
- [Testing](TESTING.md)
- [API Guide](API.md)
- [Implementation Plan](IMPLEMENTATION_PLAN.md)

## API Artifacts

- Swagger UI: `/api/v1/docs`
- OpenAPI JSON: `/api/v1/docs/openapi.json`
- Postman collection: `docs/postman/streamly.postman_collection.json`

## Status

All planned phases through Phase 15 are complete. Post-roadmap Phase 16 adds
TypeScript runtime source, HTTP Range video streaming, and production
environment templates. HTTPS is owner-confirmed for
`https://streamly.zytheran.me`. SendGrid email, Twilio SMS, and Cloudinary
thumbnail generation are integrated behind explicit provider configuration.
Deployment automation, external monitoring, and formal security review remain
future work.
