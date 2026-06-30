// @ts-nocheck
import { appConfig } from "../../config/env.js";
import {
    components,
    emptySuccessResponse,
    idParameter,
    jsonContent,
    multipartContent,
    paginatedResponse,
    paginationParameters,
    standardErrors,
    successResponse,
    usernameParameter,
    videoListParameters,
} from "./openapi-components.js";

const authSecurity = [{ bearerAuth: [] }, { accessTokenCookie: [] }];

const protectedDescription = (permission) =>
    permission
        ? `Requires authenticated user and permission: ${permission}.`
        : "Requires authenticated user.";

const ownershipDescription = (ownPermission, anyPermission) =>
    `Requires ownership with ${ownPermission}, or elevated permission ${anyPermission}.`;

const openApiDocument = {
    openapi: "3.1.0",
    info: {
        title: "Streamly API",
        version: appConfig.packageVersion,
        description:
            "Production-grade video platform backend API. Documentation reflects existing route behavior, authentication, RBAC permissions, file uploads, pagination, and error response shape.",
        license: {
            name: "Proprietary - All rights reserved",
        },
    },
    servers: [
        {
            url: "http://localhost:8000",
            description: "Local app",
        },
        {
            url: "http://localhost:8080",
            description: "Local Nginx reverse proxy",
        },
        {
            url: appConfig.docs.serverUrl || appConfig.publicBaseUrl,
            description: "Production host",
        },
    ],
    tags: [
        { name: "Root" },
        { name: "Healthcheck" },
        { name: "Auth" },
        { name: "Users" },
        { name: "Videos" },
        { name: "Comments" },
        { name: "Likes" },
        { name: "Playlists" },
        { name: "Subscriptions" },
        { name: "Dashboard" },
        { name: "Documentation" },
    ],
    components,
    paths: {
        "/": {
            get: {
                tags: ["Root"],
                summary: "API welcome response",
                responses: {
                    200: successResponse("API metadata.", {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            version: { type: "string" },
                            environment: { type: "string" },
                            documentation: { type: "string" },
                        },
                    }),
                    ...standardErrors,
                },
            },
        },
        [appConfig.docs.specRoute]: {
            get: {
                tags: ["Documentation"],
                summary: "OpenAPI JSON specification",
                description: "Available when API documentation is enabled.",
                responses: {
                    200: {
                        description: "OpenAPI document.",
                        content: jsonContent({ type: "object" }),
                    },
                    ...standardErrors,
                },
            },
        },
        "/api/v1/healthcheck": {
            get: {
                tags: ["Healthcheck"],
                summary: "Basic healthcheck",
                responses: {
                    200: successResponse("Healthcheck response.", {
                        $ref: "#/components/schemas/Healthcheck",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/healthcheck/detailed": {
            get: {
                tags: ["Healthcheck"],
                summary: "Detailed healthcheck",
                description:
                    "Returns PostgreSQL, Redis, Cloudinary, and job infrastructure readiness when available.",
                responses: {
                    200: successResponse("Detailed healthcheck response.", {
                        type: "object",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/users/register": {
            post: {
                tags: ["Auth"],
                summary: "Register user",
                description:
                    "Creates user, uploads avatar and optional cover image, assigns default role, and creates email verification token infrastructure.",
                requestBody: {
                    required: true,
                    content: multipartContent({
                        $ref: "#/components/schemas/RegisterRequest",
                    }),
                },
                responses: {
                    201: successResponse("User registered.", {
                        $ref: "#/components/schemas/User",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/users/login": {
            post: {
                tags: ["Auth"],
                summary: "Login user",
                description:
                    "Creates persistent session, returns access and refresh tokens, and sets httpOnly auth cookies.",
                requestBody: {
                    required: true,
                    content: jsonContent({
                        $ref: "#/components/schemas/LoginRequest",
                    }),
                },
                responses: {
                    200: successResponse("User logged in.", {
                        $ref: "#/components/schemas/LoginResponseData",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/users/refresh-token": {
            post: {
                tags: ["Auth"],
                summary: "Refresh access token",
                description:
                    "Accepts refresh token from cookie, body, or X-Refresh-Token header. Rotates refresh token and updates session.",
                security: [{ refreshTokenCookie: [] }],
                requestBody: {
                    required: false,
                    content: jsonContent({
                        $ref: "#/components/schemas/RefreshTokenRequest",
                    }),
                },
                parameters: [
                    {
                        name: "X-Refresh-Token",
                        in: "header",
                        schema: { type: "string" },
                        required: false,
                    },
                ],
                responses: {
                    200: successResponse("Access token refreshed.", {
                        $ref: "#/components/schemas/AuthTokens",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/users/logout": {
            post: {
                tags: ["Auth"],
                summary: "Logout current session",
                description: protectedDescription(),
                security: authSecurity,
                responses: {
                    200: emptySuccessResponse,
                    ...standardErrors,
                },
            },
        },
        "/api/v1/users/logout-all": {
            post: {
                tags: ["Auth"],
                summary: "Logout all sessions",
                description: protectedDescription(),
                security: authSecurity,
                responses: {
                    200: emptySuccessResponse,
                    ...standardErrors,
                },
            },
        },
        "/api/v1/users/change-password": {
            post: {
                tags: ["Users"],
                summary: "Change current user password",
                description: protectedDescription(),
                security: authSecurity,
                requestBody: {
                    required: true,
                    content: jsonContent({
                        $ref: "#/components/schemas/ChangePasswordRequest",
                    }),
                },
                responses: {
                    200: emptySuccessResponse,
                    ...standardErrors,
                },
            },
        },
        "/api/v1/users/current-user": {
            get: {
                tags: ["Users"],
                summary: "Get current user",
                description: protectedDescription("user:read:self"),
                security: authSecurity,
                responses: {
                    200: successResponse("Current user.", {
                        $ref: "#/components/schemas/User",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/users/update-account-details": {
            patch: {
                tags: ["Users"],
                summary: "Update current user account",
                description: protectedDescription("user:update:self"),
                security: authSecurity,
                requestBody: {
                    required: true,
                    content: jsonContent({
                        $ref: "#/components/schemas/UpdateAccountRequest",
                    }),
                },
                responses: {
                    200: successResponse("Updated user.", {
                        $ref: "#/components/schemas/User",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/users/avatar": {
            patch: {
                tags: ["Users"],
                summary: "Update avatar",
                description: protectedDescription("user:update:self"),
                security: authSecurity,
                requestBody: {
                    required: true,
                    content: multipartContent({
                        type: "object",
                        required: ["avatar"],
                        properties: {
                            avatar: { type: "string", format: "binary" },
                        },
                    }),
                },
                responses: {
                    200: successResponse("Updated user avatar.", {
                        $ref: "#/components/schemas/User",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/users/cover-image": {
            patch: {
                tags: ["Users"],
                summary: "Update cover image",
                description: protectedDescription("user:update:self"),
                security: authSecurity,
                requestBody: {
                    required: true,
                    content: multipartContent({
                        type: "object",
                        required: ["coverImage"],
                        properties: {
                            coverImage: { type: "string", format: "binary" },
                        },
                    }),
                },
                responses: {
                    200: successResponse("Updated user cover image.", {
                        $ref: "#/components/schemas/User",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/users/c/{username}": {
            get: {
                tags: ["Users"],
                summary: "Get channel profile",
                description: protectedDescription(),
                security: authSecurity,
                parameters: [usernameParameter],
                responses: {
                    200: successResponse("Channel profile.", {
                        allOf: [{ $ref: "#/components/schemas/User" }],
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/users/watch-history": {
            get: {
                tags: ["Users"],
                summary: "Get current user watch history",
                description: protectedDescription(),
                security: authSecurity,
                responses: {
                    200: successResponse("Watch history.", {
                        type: "array",
                        items: { $ref: "#/components/schemas/Video" },
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/videos": {
            get: {
                tags: ["Videos"],
                summary: "List published videos",
                parameters: videoListParameters,
                responses: {
                    200: paginatedResponse("Published videos.", {
                        $ref: "#/components/schemas/Video",
                    }),
                    ...standardErrors,
                },
            },
            post: {
                tags: ["Videos"],
                summary: "Publish video",
                description: protectedDescription("video:create"),
                security: authSecurity,
                requestBody: {
                    required: true,
                    content: multipartContent({
                        $ref: "#/components/schemas/VideoCreateRequest",
                    }),
                },
                responses: {
                    201: successResponse("Video published.", {
                        $ref: "#/components/schemas/Video",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/videos/{videoId}": {
            get: {
                tags: ["Videos"],
                summary: "Get video details",
                description:
                    "Authentication is optional. Authenticated requests may include user-specific like state and watch history behavior.",
                parameters: [idParameter("videoId", "Video id.")],
                responses: {
                    200: successResponse("Video details.", {
                        $ref: "#/components/schemas/Video",
                    }),
                    ...standardErrors,
                },
            },
            patch: {
                tags: ["Videos"],
                summary: "Update video",
                description: ownershipDescription(
                    "video:update:own",
                    "video:update:any"
                ),
                security: authSecurity,
                parameters: [idParameter("videoId", "Video id.")],
                requestBody: {
                    required: true,
                    content: multipartContent({
                        $ref: "#/components/schemas/VideoUpdateRequest",
                    }),
                },
                responses: {
                    200: successResponse("Video updated.", {
                        $ref: "#/components/schemas/Video",
                    }),
                    ...standardErrors,
                },
            },
            delete: {
                tags: ["Videos"],
                summary: "Delete video",
                description: ownershipDescription(
                    "video:delete:own",
                    "video:delete:any"
                ),
                security: authSecurity,
                parameters: [idParameter("videoId", "Video id.")],
                responses: {
                    200: emptySuccessResponse,
                    ...standardErrors,
                },
            },
        },
        "/api/v1/videos/{videoId}/stream": {
            get: {
                tags: ["Videos"],
                summary: "Stream video media with HTTP Range support",
                description:
                    "Streams a trusted stored video URL through the API. Public published videos can be streamed without authentication. Private or unpublished videos require ownership or elevated video permissions. Send a Range header for chunked playback.",
                parameters: [
                    idParameter("videoId", "Video id."),
                    {
                        name: "Range",
                        in: "header",
                        required: false,
                        schema: { type: "string", example: "bytes=0-1048575" },
                        description:
                            "Optional byte range. Valid range requests return 206 Partial Content.",
                    },
                ],
                responses: {
                    200: {
                        description:
                            "Full stream response when Range is absent or upstream provider returns full content.",
                        headers: {
                            "Accept-Ranges": {
                                schema: { type: "string", example: "bytes" },
                            },
                            "Content-Length": { schema: { type: "string" } },
                            "Content-Type": {
                                schema: {
                                    type: "string",
                                    example: "video/mp4",
                                },
                            },
                        },
                    },
                    206: {
                        description: "Partial video content.",
                        headers: {
                            "Accept-Ranges": {
                                schema: { type: "string", example: "bytes" },
                            },
                            "Content-Range": {
                                schema: {
                                    type: "string",
                                    example: "bytes 0-1048575/73400320",
                                },
                            },
                            "Content-Length": { schema: { type: "string" } },
                            "Content-Type": {
                                schema: {
                                    type: "string",
                                    example: "video/mp4",
                                },
                            },
                        },
                    },
                    416: {
                        description: "Invalid or unsatisfiable range.",
                        content: jsonContent({
                            $ref: "#/components/schemas/ApiError",
                        }),
                    },
                    ...standardErrors,
                },
            },
        },
        "/api/v1/videos/toggle/publish/{videoId}": {
            patch: {
                tags: ["Videos"],
                summary: "Toggle video publish status",
                description: ownershipDescription(
                    "video:publish:own",
                    "video:publish:any"
                ),
                security: authSecurity,
                parameters: [idParameter("videoId", "Video id.")],
                responses: {
                    200: successResponse("Updated video.", {
                        $ref: "#/components/schemas/Video",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/comments/{videoId}": {
            get: {
                tags: ["Comments"],
                summary: "List video comments",
                description: "Authentication is optional.",
                parameters: [
                    idParameter("videoId", "Video id."),
                    ...paginationParameters,
                ],
                responses: {
                    200: paginatedResponse("Video comments.", {
                        $ref: "#/components/schemas/Comment",
                    }),
                    ...standardErrors,
                },
            },
            post: {
                tags: ["Comments"],
                summary: "Add video comment",
                description: protectedDescription("comment:create"),
                security: authSecurity,
                parameters: [idParameter("videoId", "Video id.")],
                requestBody: {
                    required: true,
                    content: jsonContent({
                        $ref: "#/components/schemas/CommentRequest",
                    }),
                },
                responses: {
                    201: successResponse("Comment added.", {
                        $ref: "#/components/schemas/Comment",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/comments/c/{commentId}": {
            patch: {
                tags: ["Comments"],
                summary: "Update comment",
                description: ownershipDescription(
                    "comment:update:own",
                    "comment:update:any"
                ),
                security: authSecurity,
                parameters: [idParameter("commentId", "Comment id.")],
                requestBody: {
                    required: true,
                    content: jsonContent({
                        $ref: "#/components/schemas/CommentRequest",
                    }),
                },
                responses: {
                    200: successResponse("Comment updated.", {
                        $ref: "#/components/schemas/Comment",
                    }),
                    ...standardErrors,
                },
            },
            delete: {
                tags: ["Comments"],
                summary: "Delete comment",
                description: ownershipDescription(
                    "comment:delete:own",
                    "comment:delete:any"
                ),
                security: authSecurity,
                parameters: [idParameter("commentId", "Comment id.")],
                responses: {
                    200: emptySuccessResponse,
                    ...standardErrors,
                },
            },
        },
        "/api/v1/likes/toggle/v/{videoId}": {
            post: {
                tags: ["Likes"],
                summary: "Toggle video like",
                description: protectedDescription(),
                security: authSecurity,
                parameters: [idParameter("videoId", "Video id.")],
                responses: {
                    200: successResponse("Video like toggled.", {
                        $ref: "#/components/schemas/Like",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/likes/toggle/c/{commentId}": {
            post: {
                tags: ["Likes"],
                summary: "Toggle comment like",
                description: protectedDescription(),
                security: authSecurity,
                parameters: [idParameter("commentId", "Comment id.")],
                responses: {
                    200: successResponse("Comment like toggled.", {
                        $ref: "#/components/schemas/Like",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/likes/toggle/t/{tweetId}": {
            post: {
                tags: ["Likes"],
                summary: "Toggle tweet like",
                description:
                    "Protected compatibility route for tweet-like behavior if present.",
                security: authSecurity,
                parameters: [idParameter("tweetId", "Tweet id.")],
                responses: {
                    200: successResponse("Tweet like toggled.", {
                        $ref: "#/components/schemas/Like",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/likes/videos": {
            get: {
                tags: ["Likes"],
                summary: "List current user's liked videos",
                description: protectedDescription(),
                security: authSecurity,
                parameters: paginationParameters,
                responses: {
                    200: paginatedResponse("Liked videos.", {
                        $ref: "#/components/schemas/Video",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/playlists": {
            post: {
                tags: ["Playlists"],
                summary: "Create playlist",
                description: protectedDescription("playlist:create"),
                security: authSecurity,
                requestBody: {
                    required: true,
                    content: jsonContent({
                        $ref: "#/components/schemas/PlaylistRequest",
                    }),
                },
                responses: {
                    201: successResponse("Playlist created.", {
                        $ref: "#/components/schemas/Playlist",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/playlists/{playlistId}": {
            get: {
                tags: ["Playlists"],
                summary: "Get playlist by id",
                description: protectedDescription(),
                security: authSecurity,
                parameters: [idParameter("playlistId", "Playlist id.")],
                responses: {
                    200: successResponse("Playlist details.", {
                        $ref: "#/components/schemas/Playlist",
                    }),
                    ...standardErrors,
                },
            },
            patch: {
                tags: ["Playlists"],
                summary: "Update playlist",
                description: ownershipDescription(
                    "playlist:update:own",
                    "playlist:update:any"
                ),
                security: authSecurity,
                parameters: [idParameter("playlistId", "Playlist id.")],
                requestBody: {
                    required: true,
                    content: jsonContent({
                        $ref: "#/components/schemas/PlaylistRequest",
                    }),
                },
                responses: {
                    200: successResponse("Playlist updated.", {
                        $ref: "#/components/schemas/Playlist",
                    }),
                    ...standardErrors,
                },
            },
            delete: {
                tags: ["Playlists"],
                summary: "Delete playlist",
                description: ownershipDescription(
                    "playlist:delete:own",
                    "playlist:delete:any"
                ),
                security: authSecurity,
                parameters: [idParameter("playlistId", "Playlist id.")],
                responses: {
                    200: emptySuccessResponse,
                    ...standardErrors,
                },
            },
        },
        "/api/v1/playlists/user/{userId}": {
            get: {
                tags: ["Playlists"],
                summary: "List user playlists",
                description: protectedDescription(),
                security: authSecurity,
                parameters: [idParameter("userId", "User id.")],
                responses: {
                    200: successResponse("User playlists.", {
                        type: "array",
                        items: { $ref: "#/components/schemas/Playlist" },
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/playlists/add/{videoId}/{playlistId}": {
            patch: {
                tags: ["Playlists"],
                summary: "Add video to playlist",
                description: ownershipDescription(
                    "playlist:video:manage:own",
                    "playlist:video:manage:any"
                ),
                security: authSecurity,
                parameters: [
                    idParameter("videoId", "Video id."),
                    idParameter("playlistId", "Playlist id."),
                ],
                responses: {
                    200: successResponse("Playlist updated.", {
                        $ref: "#/components/schemas/Playlist",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/playlists/remove/{videoId}/{playlistId}": {
            patch: {
                tags: ["Playlists"],
                summary: "Remove video from playlist",
                description: ownershipDescription(
                    "playlist:video:manage:own",
                    "playlist:video:manage:any"
                ),
                security: authSecurity,
                parameters: [
                    idParameter("videoId", "Video id."),
                    idParameter("playlistId", "Playlist id."),
                ],
                responses: {
                    200: successResponse("Playlist updated.", {
                        $ref: "#/components/schemas/Playlist",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/subscriptions/c/{channelId}": {
            get: {
                tags: ["Subscriptions"],
                summary: "List channel subscribers",
                description: "Authentication is optional.",
                parameters: [
                    idParameter("channelId", "Channel user id."),
                    ...paginationParameters,
                ],
                responses: {
                    200: paginatedResponse("Channel subscribers.", {
                        $ref: "#/components/schemas/Subscription",
                    }),
                    ...standardErrors,
                },
            },
            post: {
                tags: ["Subscriptions"],
                summary: "Toggle channel subscription",
                description: protectedDescription(),
                security: authSecurity,
                parameters: [idParameter("channelId", "Channel user id.")],
                responses: {
                    200: successResponse("Subscription toggled.", {
                        type: "object",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/subscriptions/u/{subscriberId}": {
            get: {
                tags: ["Subscriptions"],
                summary: "List subscribed channels",
                parameters: [
                    idParameter("subscriberId", "Subscriber user id."),
                    ...paginationParameters,
                ],
                responses: {
                    200: paginatedResponse("Subscribed channels.", {
                        $ref: "#/components/schemas/Subscription",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/dashboard/stats": {
            get: {
                tags: ["Dashboard"],
                summary: "Get current channel stats",
                description: protectedDescription(),
                security: authSecurity,
                responses: {
                    200: successResponse("Dashboard stats.", {
                        $ref: "#/components/schemas/DashboardStats",
                    }),
                    ...standardErrors,
                },
            },
        },
        "/api/v1/dashboard/videos": {
            get: {
                tags: ["Dashboard"],
                summary: "Get current channel videos",
                description: protectedDescription(),
                security: authSecurity,
                parameters: paginationParameters,
                responses: {
                    200: paginatedResponse("Dashboard videos.", {
                        $ref: "#/components/schemas/Video",
                    }),
                    ...standardErrors,
                },
            },
        },
    },
};

export { openApiDocument };
