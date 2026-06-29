CREATE TABLE "roles" (
    "id" CHAR(24) NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "description" VARCHAR(255) NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "permissions" (
    "id" CHAR(24) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255) NOT NULL DEFAULT '',
    "resource" VARCHAR(60) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_roles" (
    "id" CHAR(24) NOT NULL,
    "userId" CHAR(24) NOT NULL,
    "roleId" CHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_permissions" (
    "id" CHAR(24) NOT NULL,
    "roleId" CHAR(24) NOT NULL,
    "permissionId" CHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
CREATE INDEX "roles_createdAt_idx" ON "roles"("createdAt");

CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");
CREATE INDEX "permissions_resource_action_idx" ON "permissions"("resource", "action");

CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "user_roles"("userId", "roleId");
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
