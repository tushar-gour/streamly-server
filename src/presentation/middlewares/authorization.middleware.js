import { container } from "../../core/container/index.js";
import {
    ForbiddenError,
    UnauthorizedError,
} from "../../shared/errors/api-error.js";
import { asyncHandler } from "../../shared/helpers/async-handler.js";
import { audit } from "../../infrastructure/logger/audit-logger.js";

const authorizationService = container.services.authorizationService;
const policyService = container.services.policyService;

const requireAuthenticatedUser = (req) => {
    if (!req.user?._id) {
        throw new UnauthorizedError("Authentication required");
    }
};

const requirePermission = (permission) =>
    asyncHandler(async (req, res, next) => {
        requireAuthenticatedUser(req);
        const allowed = await authorizationService.hasPermission(
            req.user._id,
            permission
        );

        if (!allowed) {
            audit.warn("authz.permission_denied", {
                userId: req.user._id,
                requiredPermission: permission,
                path: req.originalUrl,
            });
            throw new ForbiddenError("You do not have permission");
        }

        next();
    });

const requireAnyPermission = (permissions) =>
    asyncHandler(async (req, res, next) => {
        requireAuthenticatedUser(req);

        const allowed = await authorizationService.hasAnyPermission(
            req.user._id,
            permissions
        );

        if (!allowed) {
            audit.warn("authz.permission_denied", {
                userId: req.user._id,
                requiredPermissions: permissions,
                path: req.originalUrl,
            });
            throw new ForbiddenError("You do not have permission");
        }

        next();
    });

const requireAllPermissions = (permissions) =>
    asyncHandler(async (req, res, next) => {
        requireAuthenticatedUser(req);

        const allowed = await authorizationService.hasAllPermissions(
            req.user._id,
            permissions
        );

        if (!allowed) {
            audit.warn("authz.permission_denied", {
                userId: req.user._id,
                requiredPermissions: permissions,
                path: req.originalUrl,
            });
            throw new ForbiddenError("You do not have permission");
        }

        next();
    });

const requireOwnershipOrPermission = ({
    policy,
    ownPermission,
    anyPermission,
}) =>
    asyncHandler(async (req, res, next) => {
        requireAuthenticatedUser(req);

        if (
            anyPermission &&
            (await authorizationService.hasPermission(
                req.user._id,
                anyPermission
            ))
        ) {
            return next();
        }

        if (
            ownPermission &&
            !(await authorizationService.hasPermission(
                req.user._id,
                ownPermission
            ))
        ) {
            audit.warn("authz.permission_denied", {
                userId: req.user._id,
                requiredPermission: ownPermission,
                path: req.originalUrl,
            });
            throw new ForbiddenError("You do not have permission");
        }

        const allowedByPolicy = await policyService[policy]?.({
            userId: req.user._id,
            params: req.params,
            body: req.body,
            query: req.query,
        });

        if (!allowedByPolicy) {
            audit.warn("authz.policy_denied", {
                userId: req.user._id,
                policy,
                ownPermission,
                anyPermission,
                path: req.originalUrl,
            });
            throw new ForbiddenError("You do not have permission");
        }

        return next();
    });

export {
    requireAllPermissions,
    requireAnyPermission,
    requireOwnershipOrPermission,
    requirePermission,
};
