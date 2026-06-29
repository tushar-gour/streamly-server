// @ts-nocheck
import { RoleRepository } from "../../domain/repositories/role.repository.js";
import { createId } from "../../shared/helpers/id-generator.js";
import { prisma } from "../database/prisma/client.js";
import { withId } from "../database/prisma-record.mapper.js";

class PrismaRoleRepository extends RoleRepository {
    async findById(roleId) {
        return withId(await prisma.role.findUnique({ where: { id: roleId } }));
    }

    async findByName(name) {
        return withId(await prisma.role.findUnique({ where: { name } }));
    }

    async upsertRole(roleData) {
        return withId(
            await prisma.role.upsert({
                where: { name: roleData.name },
                update: {
                    description: roleData.description || "",
                },
                create: {
                    id: createId(),
                    name: roleData.name,
                    description: roleData.description || "",
                },
            })
        );
    }
}

export { PrismaRoleRepository };
