# Streamly API Guide

The full API contract is maintained in OpenAPI. This guide explains how to use
the docs and the shared API behavior.

## Swagger UI

Direct app:

```txt
http://localhost:8000/api/v1/docs
```

Nginx proxy:

```txt
http://localhost:8080/api/v1/docs
```

## OpenAPI JSON

Direct app:

```txt
http://localhost:8000/api/v1/docs/openapi.json
```

Nginx proxy:

```txt
http://localhost:8080/api/v1/docs/openapi.json
```

Validate docs:

```bash
npm run docs:validate
```

## Postman Collection

```txt
docs/postman/streamly.postman_collection.json
```

Collection variables:

- `baseUrl`
- `accessToken`
- `refreshToken`

No real tokens or secrets are included.

## Authentication

Protected routes accept bearer access tokens:

```txt
Authorization: Bearer ACCESS_TOKEN
```

The API also supports auth cookies where configured. Refresh token rotation is
available through the refresh endpoint.

## Common Auth Routes

```txt
POST /api/v1/users/register
POST /api/v1/users/login
POST /api/v1/users/refresh-token
POST /api/v1/users/logout
POST /api/v1/users/logout-all
GET  /api/v1/users/current-user
```

## Response Format

Success responses follow the existing shared response style:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OK",
  "data": {}
}
```

Errors use the existing error shape:

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Access token is required",
  "errors": []
}
```

Exact response fields are documented in OpenAPI.

## Pagination

Existing pagination uses query parameters such as:

- `page`
- `limit`
- `sortBy`
- `sortType`
- `query`

Cursor pagination is not implemented.

## Rate Limits

Rate limit responses use the shared API error format. Limits are controlled by:

- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_RATE_LIMIT_MAX`

## File Uploads

Multipart endpoints include:

- user avatar
- user cover image
- video file
- video thumbnail

Upload fields are documented in OpenAPI. Cloudinary stores uploaded assets.

## API Modules

- Healthcheck
- Users and auth
- Videos
- Comments
- Likes
- Playlists
- Subscriptions
- Dashboard

Business route count: `42`.

## RBAC Notes

Protected write routes may require:

- explicit permission
- ownership policy
- either ownership or elevated permission

Swagger descriptions document permission expectations where practical.
