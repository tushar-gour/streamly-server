// @ts-nocheck
import { RolePermissionRepository } from "../../domain/repositories/role-permission.repository.js";
import { createId } from "../../shared/helpers/id-generator.js";
import { prisma } from "../database/prisma/client.js";
import { withId } from "../database/prisma-record.mapper.js";

class PrismaRolePermissionRepository extends RolePermissionRepository {
    async assignPermissionToRole(roleId, permissionId) {
        return withId(
            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: {
                        roleId,
                        permissionId,
                    },
                },
                update: {},
                create: {
                    id: createId(),
                    roleId,
                    permissionId,
                },
            })
        );
    }

    async getRolePermissions(roleId) {
        const rolePermissions = await prisma.rolePermission.findMany({
            where: { roleId },
            include: { permission: true },
            orderBy: { createdAt: "asc" },
        });

        return rolePermissions.map((entry) => withId(entry.permission));
    }
}

export { PrismaRolePermissionRepository };
