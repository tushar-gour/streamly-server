import { appConfig } from "../src/config/env.js";
import { prisma } from "../src/infrastructure/database/prisma/client.js";
import { audit } from "../src/infrastructure/logger/audit-logger.js";
import { createId } from "../src/shared/helpers/id-generator.js";

const roles = [
    { name: "admin", description: "Full platform administration access" },
    { name: "moderator", description: "Content moderation access" },
    { name: "creator", description: "Creator content management access" },
    { name: "user", description: "Default authenticated user access" },
];

const permissions = [
    ["video:create", "video", "create", "Create videos"],
    ["video:update:own", "video", "update:own", "Update own videos"],
    ["video:update:any", "video", "update:any", "Update any video"],
    ["video:delete:own", "video", "delete:own", "Delete own videos"],
    ["video:delete:any", "video", "delete:any", "Delete any video"],
    ["video:publish:own", "video", "publish:own", "Publish own videos"],
    ["video:publish:any", "video", "publish:any", "Publish any video"],
    ["comment:create", "comment", "create", "Create comments"],
    ["comment:update:own", "comment", "update:own", "Update own comments"],
    ["comment:update:any", "comment", "update:any", "Update any comment"],
    ["comment:delete:own", "comment", "delete:own", "Delete own comments"],
    ["comment:delete:any", "comment", "delete:any", "Delete any comment"],
    ["playlist:create", "playlist", "create", "Create playlists"],
    ["playlist:update:own", "playlist", "update:own", "Update own playlists"],
    ["playlist:update:any", "playlist", "update:any", "Update any playlist"],
    ["playlist:delete:own", "playlist", "delete:own", "Delete own playlists"],
    ["playlist:delete:any", "playlist", "delete:any", "Delete any playlist"],
    [
        "playlist:video:manage:own",
        "playlist",
        "video:manage:own",
        "Manage own playlist videos",
    ],
    [
        "playlist:video:manage:any",
        "playlist",
        "video:manage:any",
        "Manage any playlist videos",
    ],
    ["user:read:self", "user", "read:self", "Read own account"],
    ["user:update:self", "user", "update:self", "Update own account"],
    ["user:admin", "user", "admin", "Administer users"],
];

const userPermissions = [
    "video:create",
    "video:update:own",
    "video:delete:own",
    "video:publish:own",
    "comment:create",
    "comment:update:own",
    "comment:delete:own",
    "playlist:create",
    "playlist:update:own",
    "playlist:delete:own",
    "playlist:video:manage:own",
    "user:read:self",
    "user:update:self",
];

const moderatorPermissions = [
    ...userPermissions,
    "video:update:any",
    "video:delete:any",
    "video:publish:any",
    "comment:update:any",
    "comment:delete:any",
    "playlist:update:any",
    "playlist:delete:any",
    "playlist:video:manage:any",
];

const rolePermissionNames = {
    user: userPermissions,
    creator: userPermissions,
    moderator: moderatorPermissions,
    admin: permissions.map(([name]) => name),
};

const upsertRoles = async () => {
    const roleMap = new Map();

    for (const role of roles) {
        const savedRole = await prisma.role.upsert({
            where: { name: role.name },
            update: { description: role.description },
            create: { id: createId(), ...role },
        });

        roleMap.set(savedRole.name, savedRole);
    }

    return roleMap;
};

const upsertPermissions = async () => {
    const permissionMap = new Map();

    for (const [name, resource, action, description] of permissions) {
        const permission = await prisma.permission.upsert({
            where: { name },
            update: { resource, action, description },
            create: { id: createId(), name, resource, action, description },
        });

        permissionMap.set(permission.name, permission);
    }

    return permissionMap;
};

const assignRolePermissions = async (roleMap, permissionMap) => {
    let assignmentCount = 0;

    for (const [roleName, permissionNames] of Object.entries(
        rolePermissionNames
    )) {
        const role = roleMap.get(roleName);

        for (const permissionName of permissionNames) {
            const permission = permissionMap.get(permissionName);

            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: {
                        roleId: role.id,
                        permissionId: permission.id,
                    },
                },
                update: {},
                create: {
                    id: createId(),
                    roleId: role.id,
                    permissionId: permission.id,
                },
            });

            assignmentCount += 1;
        }
    }

    return assignmentCount;
};

const assignDefaultRoleToExistingUsers = async (defaultRoleId) => {
    const usersWithoutRoles = await prisma.user.findMany({
        where: { userRoles: { none: {} } },
        select: { id: true },
    });

    if (usersWithoutRoles.length === 0) return 0;

    const result = await prisma.userRole.createMany({
        data: usersWithoutRoles.map((user) => ({
            id: createId(),
            userId: user.id,
            roleId: defaultRoleId,
        })),
        skipDuplicates: true,
    });

    return result.count;
};

const promoteAdminUser = async (adminRoleId) => {
    const adminEmail = appConfig.rbac.adminEmail?.toLowerCase();

    if (!adminEmail) return false;

    const adminUser = await prisma.user.findUnique({
        where: { email: adminEmail },
        select: { id: true },
    });

    if (!adminUser) return false;

    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: adminUser.id,
                roleId: adminRoleId,
            },
        },
        update: {},
        create: {
            id: createId(),
            userId: adminUser.id,
            roleId: adminRoleId,
        },
    });

    return true;
};

try {
    const roleMap = await upsertRoles();
    const permissionMap = await upsertPermissions();
    const assignmentCount = await assignRolePermissions(roleMap, permissionMap);
    const defaultRole = roleMap.get(appConfig.rbac.defaultRole);

    if (!defaultRole) {
        throw new Error("Configured default RBAC role was not seeded.");
    }

    const defaultAssignments = await assignDefaultRoleToExistingUsers(
        defaultRole.id
    );
    const adminPromoted = await promoteAdminUser(roleMap.get("admin").id);
    audit.info("rbac.seed_completed", {
        roles: roleMap.size,
        permissions: permissionMap.size,
        rolePermissionAssignments: assignmentCount,
        defaultAssignments,
        adminPromoted,
    });

    console.log("RBAC seed completed.");
    console.log(`Roles ensured: ${roleMap.size}`);
    console.log(`Permissions ensured: ${permissionMap.size}`);
    console.log(`Role permissions ensured: ${assignmentCount}`);
    console.log(`Default user assignments created: ${defaultAssignments}`);
    console.log(`Admin bootstrap applied: ${adminPromoted}`);
} catch (error) {
    console.error("RBAC seed failed.");
    console.error(error.message);
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
}
