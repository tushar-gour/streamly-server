import { container } from "../../core/container/index.js";
import {
    ApiError,
    UnauthorizedError,
    ForbiddenError,
} from "../../shared/errors/api-error.js";
import { asyncHandler } from "../../shared/helpers/async-handler.js";

const authService = container.services.authService;

class AuthMiddleware {
    static verifyJWT = asyncHandler(async (req, res, next) => {
        try {
            const token = AuthMiddleware.#extractToken(req);

            if (!token) {
                throw new UnauthorizedError("Access token is required");
            }

            const authContext = await authService.verifyAccessToken(token);

            req.user = authContext.user;
            req.auth = { sessionId: authContext.sessionId };
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

            const authContext = await authService.verifyAccessToken(token);
            req.user = authContext.user;
            req.auth = { sessionId: authContext.sessionId };
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

            const user = await authService.verifyRefreshToken(refreshToken);

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
}

export const verifyJWT = AuthMiddleware.verifyJWT;
export const optionalAuth = AuthMiddleware.optionalAuth;
export const verifyRefreshToken = AuthMiddleware.verifyRefreshToken;
export const hasRole = AuthMiddleware.hasRole;
export const isOwner = AuthMiddleware.isOwner;
export const rateLimit = AuthMiddleware.rateLimit;
export { AuthMiddleware };
