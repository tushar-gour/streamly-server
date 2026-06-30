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

## Hosted Auth Platform Routes

```txt
POST /api/v1/users/auth/signup/start
POST /api/v1/users/auth/signup/verify-email
POST /api/v1/users/auth/signup/phone/start
POST /api/v1/users/auth/signup/phone/verify
POST /api/v1/users/auth/signup/mfa/setup
POST /api/v1/users/auth/signup/mfa/verify
POST /api/v1/users/auth/login/start
POST /api/v1/users/auth/login/verify-otp
POST /api/v1/users/auth/login/verify-mfa
```

These routes support staged signup, email OTP, optional phone verification by
SMS or WhatsApp, authenticator-app MFA, and smart captcha responses when risk is
elevated.

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
When thumbnail jobs are enabled, Streamly can generate a Cloudinary video-frame
thumbnail in the background and update the existing thumbnail URL without
changing the upload response shape.

## API Modules

- Healthcheck
- Users and auth
- Videos
- Comments
- Likes
- Playlists
- Subscriptions
- Dashboard

Business route count: `52`.

## Video Streaming

```txt
GET /api/v1/videos/{videoId}/stream
```

The stream endpoint supports HTTP Range requests for large video playback.

Headers:

- `Range: bytes=0-1048575`
- `Accept-Ranges: bytes`
- `Content-Range` on partial responses
- `Content-Length`
- `Content-Type`

Expected responses:

- `206 Partial Content` for valid range requests.
- `200 OK` when a full stream is served.
- `416 Range Not Satisfiable` for invalid ranges.
- `401` when private video streaming requires authentication.
- `403` when the authenticated user does not own the private video and lacks elevated video permission.

The endpoint streams trusted media URLs stored in the database. It does not
stream arbitrary user-supplied URLs.

## RBAC Notes

Protected write routes may require:

- explicit permission
- ownership policy
- either ownership or elevated permission

Swagger descriptions document permission expectations where practical.
