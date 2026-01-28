import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import {
    ApiError,
    UnauthorizedError,
    ForbiddenError,
} from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

class AuthMiddleware {
    static verifyJWT = asyncHandler(async (req, res, next) => {
        try {
            const token = AuthMiddleware.#extractToken(req);

            if (!token) {
                throw new UnauthorizedError("Access token is required");
            }

            const decodedToken = AuthMiddleware.#verifyToken(
                token,
                process.env.ACCESS_TOKEN_SECRET
            );

            const user = await User.findById(decodedToken._id).select(
                "-password -refreshToken"
            );

            if (!user) {
                throw new UnauthorizedError(
                    "Invalid access token - user not found"
                );
            }

            req.user = user;
            next();
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            if (error.name === "JsonWebTokenError") {
                throw new UnauthorizedError("Invalid access token");
            }
            if (error.name === "TokenExpiredError") {
                throw new UnauthorizedError("Access token has expired");
            }

            throw new UnauthorizedError(
                error?.message || "Authentication failed"
            );
        }
    });

    static optionalAuth = asyncHandler(async (req, res, next) => {
        try {
            const token = AuthMiddleware.#extractToken(req);

            if (!token) {
                req.user = null;
                return next();
            }

            const decodedToken = AuthMiddleware.#verifyToken(
                token,
                process.env.ACCESS_TOKEN_SECRET
            );

            const user = await User.findById(decodedToken._id).select(
                "-password -refreshToken"
            );

            req.user = user || null;
            next();
        } catch (error) {
            req.user = null;
            next();
        }
    });

    static verifyRefreshToken = asyncHandler(async (req, res, next) => {
        try {
            const refreshToken =
                req.cookies?.refreshToken ||
                req.body?.refreshToken ||
                req.header("X-Refresh-Token");

            if (!refreshToken) {
                throw new UnauthorizedError("Refresh token is required");
            }

            const decodedToken = AuthMiddleware.#verifyToken(
                refreshToken,
                process.env.REFRESH_TOKEN_SECRET
            );

            const user = await User.findById(decodedToken._id).select(
                "+refreshToken"
            );

            if (!user) {
                throw new UnauthorizedError(
                    "Invalid refresh token - user not found"
                );
            }

            if (user.refreshToken !== refreshToken) {
                throw new UnauthorizedError("Refresh token has been revoked");
            }

            req.user = user;
            req.refreshToken = refreshToken;
            next();
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new UnauthorizedError("Invalid or expired refresh token");
        }
    });

    static hasRole = (...roles) => {
        return asyncHandler(async (req, res, next) => {
            if (!req.user) {
                throw new UnauthorizedError("Authentication required");
            }

            if (!roles.includes(req.user.role)) {
                throw new ForbiddenError(
                    `Access denied. Required role: ${roles.join(" or ")}`
                );
            }

            next();
        });
    };

    static isOwner = (getResourceOwnerId) => {
        return asyncHandler(async (req, res, next) => {
            if (!req.user) {
                throw new UnauthorizedError("Authentication required");
            }

            const ownerId = await getResourceOwnerId(req);

            if (!ownerId) {
                throw new ForbiddenError("Resource not found");
            }

            if (req.user._id.toString() !== ownerId.toString()) {
                throw new ForbiddenError(
                    "You don't have permission to access this resource"
                );
            }

            next();
        });
    };

    static rateLimit = (maxRequests = 100, windowMs = 60000) => {
        const requests = new Map();

        return asyncHandler(async (req, res, next) => {
            const userId = req.user?._id?.toString() || req.ip;
            const now = Date.now();
            const windowStart = now - windowMs;

            let userRequests = requests.get(userId) || [];

            userRequests = userRequests.filter((time) => time > windowStart);

            if (userRequests.length >= maxRequests) {
                const retryAfter = Math.ceil(
                    (userRequests[0] + windowMs - now) / 1000
                );
                res.set("Retry-After", retryAfter);
                throw new ApiError(
                    429,
                    `Too many requests. Try again in ${retryAfter} seconds`
                );
            }

            userRequests.push(now);
            requests.set(userId, userRequests);

            next();
        });
    };

    static #extractToken(req) {
        if (req.cookies?.accessToken) {
            return req.cookies.accessToken;
        }

        const authHeader = req.header("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
            return authHeader.slice(7);
        }

        return null;
    }

    static #verifyToken(token, secret) {
        return jwt.verify(token, secret);
    }
}

export const verifyJWT = AuthMiddleware.verifyJWT;
export const optionalAuth = AuthMiddleware.optionalAuth;
export const verifyRefreshToken = AuthMiddleware.verifyRefreshToken;
export const hasRole = AuthMiddleware.hasRole;
export const isOwner = AuthMiddleware.isOwner;
export const rateLimit = AuthMiddleware.rateLimit;
export { AuthMiddleware };
