// @ts-nocheck
import { appConfig } from "../../config/env.js";

export const HttpStatus = Object.freeze({
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    PAYLOAD_TOO_LARGE: 413,
    RANGE_NOT_SATISFIABLE: 416,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
});

export const PaginationDefaults = Object.freeze({
    PAGE: 1,
    LIMIT: 10,
    MAX_LIMIT: 100,
    SORT_BY: "createdAt",
    SORT_ORDER: "desc",
});

export const FileUploadConfig = Object.freeze({
    MAX_FILE_SIZE: 50 * 1024 * 1024,
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    ALLOWED_VIDEO_TYPES: [
        "video/mp4",
        "video/mpeg",
        "video/quicktime",
        "video/webm",
    ],
    UPLOAD_FOLDER: "youtube-clone",
});

export const JwtConfig = Object.freeze({
    ACCESS_TOKEN_EXPIRY: appConfig.jwt.accessTokenExpiry,
    REFRESH_TOKEN_EXPIRY: appConfig.jwt.refreshTokenExpiry,
});

export const CookieOptions = Object.freeze({
    httpOnly: true,
    secure: appConfig.security.cookieSecure,
    sameSite: appConfig.security.cookieSameSite,
    maxAge: 24 * 60 * 60 * 1000,
});

export const ErrorMessages = Object.freeze({
    UNAUTHORIZED: "Unauthorized access. Please login.",
    INVALID_TOKEN: "Invalid or expired token.",
    TOKEN_EXPIRED: "Token has expired. Please login again.",
    VALIDATION_FAILED: "Validation failed. Please check your input.",
    REQUIRED_FIELD: "This field is required.",
    INVALID_EMAIL: "Please provide a valid email address.",
    INVALID_PASSWORD: "Password must be at least 8 characters.",
    NOT_FOUND: "Resource not found.",
    USER_NOT_FOUND: "User not found.",
    VIDEO_NOT_FOUND: "Video not found.",
    COMMENT_NOT_FOUND: "Comment not found.",
    PLAYLIST_NOT_FOUND: "Playlist not found.",
    USER_EXISTS: "User with this email or username already exists.",
    ALREADY_SUBSCRIBED: "Already subscribed to this channel.",
    INTERNAL_ERROR: "Internal server error. Please try again later.",
    DATABASE_ERROR: "Database operation failed.",
});

export const SuccessMessages = Object.freeze({
    REGISTER_SUCCESS: "User registered successfully.",
    LOGIN_SUCCESS: "User logged in successfully.",
    LOGOUT_SUCCESS: "User logged out successfully.",
    PASSWORD_CHANGED: "Password changed successfully.",
    TOKEN_REFRESHED: "Access token refreshed successfully.",
    USER_FETCHED: "User fetched successfully.",
    USER_UPDATED: "User updated successfully.",
    AVATAR_UPDATED: "Avatar updated successfully.",
    COVER_IMAGE_UPDATED: "Cover image updated successfully.",
    VIDEO_CREATED: "Video published successfully.",
    VIDEO_FETCHED: "Video fetched successfully.",
    VIDEO_UPDATED: "Video updated successfully.",
    VIDEO_DELETED: "Video deleted successfully.",
    COMMENT_ADDED: "Comment added successfully.",
    COMMENT_UPDATED: "Comment updated successfully.",
    COMMENT_DELETED: "Comment deleted successfully.",
    PLAYLIST_CREATED: "Playlist created successfully.",
    PLAYLIST_UPDATED: "Playlist updated successfully.",
    PLAYLIST_DELETED: "Playlist deleted successfully.",
    SUBSCRIBED: "Subscribed successfully.",
    UNSUBSCRIBED: "Unsubscribed successfully.",
});
