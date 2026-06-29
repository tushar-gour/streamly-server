import {
    ForbiddenError,
    UnauthorizedError,
} from "../../shared/errors/api-error.js";

class AuthorizationService {
    constructor({ userRoleRepository }) {
        this.userRoleRepository = userRoleRepository;
    }

    async getUserRoles(userId) {
        return this.userRoleRepository.getUserRoles(userId);
    }

    async getUserPermissions(userId) {
        return this.userRoleRepository.getUserPermissions(userId);
    }

    async hasPermission(userId, permission) {
        const permissions = await this.getUserPermissions(userId);
        return permissions.some((entry) => entry.name === permission);
    }

    async hasAnyPermission(userId, permissions) {
        const userPermissions = await this.getUserPermissions(userId);
        const userPermissionNames = new Set(
            userPermissions.map((entry) => entry.name)
        );

        return permissions.some((permission) =>
            userPermissionNames.has(permission)
        );
    }

    async hasAllPermissions(userId, permissions) {
        const userPermissions = await this.getUserPermissions(userId);
        const userPermissionNames = new Set(
            userPermissions.map((entry) => entry.name)
        );

        return permissions.every((permission) =>
            userPermissionNames.has(permission)
        );
    }

    ensureAuthenticated(user) {
        if (!user?._id) {
            throw new UnauthorizedError("Authentication required");
        }
    }

    async requirePermission(user, permission) {
        this.ensureAuthenticated(user);

        if (!(await this.hasPermission(user._id, permission))) {
            throw new ForbiddenError("You do not have permission");
        }
    }
}

export { AuthorizationService };
