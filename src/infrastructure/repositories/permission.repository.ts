// @ts-nocheck
import { PermissionRepository } from "../../domain/repositories/permission.repository.js";
import { createId } from "../../shared/helpers/id-generator.js";
import { prisma } from "../database/prisma/client.js";
import { withId } from "../database/prisma-record.mapper.js";

class PrismaPermissionRepository extends PermissionRepository {
    async findByName(name) {
        return withId(await prisma.permission.findUnique({ where: { name } }));
    }

    async upsertPermission(permissionData) {
        return withId(
            await prisma.permission.upsert({
                where: { name: permissionData.name },
                update: {
                    description: permissionData.description || "",
                    resource: permissionData.resource,
                    action: permissionData.action,
                },
                create: {
                    id: createId(),
                    name: permissionData.name,
                    description: permissionData.description || "",
                    resource: permissionData.resource,
                    action: permissionData.action,
                },
            })
        );
    }
}

export { PrismaPermissionRepository };
