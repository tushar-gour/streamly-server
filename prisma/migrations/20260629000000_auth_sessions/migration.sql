ALTER TABLE "users"
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "users" DROP COLUMN IF EXISTS "refreshToken";

CREATE TABLE "sessions" (
    "id" CHAR(24) NOT NULL,
    "userId" CHAR(24) NOT NULL,
    "refreshTokenHash" CHAR(64) NOT NULL,
    "userAgent" TEXT,
    "ipAddress" VARCHAR(64),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" VARCHAR(120),
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_verification_tokens" (
    "id" CHAR(24) NOT NULL,
    "userId" CHAR(24) NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_verification_tokens_tokenHash_key" ON "email_verification_tokens"("tokenHash");
CREATE INDEX "sessions_userId_revokedAt_idx" ON "sessions"("userId", "revokedAt");
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");
CREATE INDEX "sessions_refreshTokenHash_idx" ON "sessions"("refreshTokenHash");
CREATE INDEX "email_verification_tokens_userId_expiresAt_idx" ON "email_verification_tokens"("userId", "expiresAt");
CREATE INDEX "email_verification_tokens_usedAt_idx" ON "email_verification_tokens"("usedAt");

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
