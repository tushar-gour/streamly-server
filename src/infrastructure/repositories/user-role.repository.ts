// @ts-nocheck
import { UserRoleRepository } from "../../domain/repositories/user-role.repository.js";
import { createId } from "../../shared/helpers/id-generator.js";
import { prisma } from "../database/prisma/client.js";
import { withId } from "../database/prisma-record.mapper.js";

class PrismaUserRoleRepository extends UserRoleRepository {
    async assignRoleToUser(userId, roleId) {
        return withId(
            await prisma.userRole.upsert({
                where: {
                    userId_roleId: {
                        userId,
                        roleId,
                    },
                },
                update: {},
                create: {
                    id: createId(),
                    userId,
                    roleId,
                },
            })
        );
    }

    async removeRoleFromUser(userId, roleId) {
        return prisma.userRole.deleteMany({
            where: {
                userId,
                roleId,
            },
        });
    }

    async getUserRoles(userId) {
        const userRoles = await prisma.userRole.findMany({
            where: { userId },
            include: { role: true },
            orderBy: { createdAt: "asc" },
        });

        return userRoles.map((userRole) => withId(userRole.role));
    }

    async getUserPermissions(userId) {
        const userRoles = await prisma.userRole.findMany({
            where: { userId },
            include: {
                role: {
                    include: {
                        rolePermissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });

        const permissions = new Map();

        for (const userRole of userRoles) {
            for (const rolePermission of userRole.role.rolePermissions) {
                permissions.set(
                    rolePermission.permission.name,
                    withId(rolePermission.permission)
                );
            }
        }

        return [...permissions.values()];
    }

    async assignRoleToUsersWithoutRoles(roleId) {
        const usersWithoutRoles = await prisma.user.findMany({
            where: {
                userRoles: {
                    none: {},
                },
            },
            select: { id: true },
        });

        if (usersWithoutRoles.length === 0) {
            return 0;
        }

        const result = await prisma.userRole.createMany({
            data: usersWithoutRoles.map((user) => ({
                id: createId(),
                userId: user.id,
                roleId,
            })),
            skipDuplicates: true,
        });

        return result.count;
    }
}

export { PrismaUserRoleRepository };
