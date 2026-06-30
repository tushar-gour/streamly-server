ALTER TABLE "users"
ADD COLUMN "phoneNumber" VARCHAR(32),
ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN "onboardingStatus" VARCHAR(40) NOT NULL DEFAULT 'active',
ADD COLUMN "mfaEnabledAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

CREATE TABLE "auth_challenges" (
    "id" CHAR(24) NOT NULL,
    "userId" CHAR(24),
    "identifierHash" CHAR(64) NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "purpose" VARCHAR(60) NOT NULL,
    "codeHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auth_challenges_userId_idx" ON "auth_challenges"("userId");
CREATE INDEX "auth_challenges_identifierHash_purpose_channel_idx" ON "auth_challenges"("identifierHash", "purpose", "channel");
CREATE INDEX "auth_challenges_expiresAt_idx" ON "auth_challenges"("expiresAt");
CREATE INDEX "auth_challenges_consumedAt_idx" ON "auth_challenges"("consumedAt");

ALTER TABLE "auth_challenges"
ADD CONSTRAINT "auth_challenges_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_mfa" (
    "id" CHAR(24) NOT NULL,
    "userId" CHAR(24) NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'totp',
    "secretEncrypted" TEXT NOT NULL,
    "enabledAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "recoveryCodesHash" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_mfa_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_mfa_userId_type_key" ON "user_mfa"("userId", "type");
CREATE INDEX "user_mfa_enabledAt_idx" ON "user_mfa"("enabledAt");

ALTER TABLE "user_mfa"
ADD CONSTRAINT "user_mfa_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "mfa_challenges" (
    "id" CHAR(24) NOT NULL,
    "userId" CHAR(24) NOT NULL,
    "loginMethod" VARCHAR(40) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "deviceFingerprintHash" CHAR(64) NOT NULL,
    "ipHash" CHAR(64),
    "userAgentHash" CHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mfa_challenges_userId_expiresAt_idx" ON "mfa_challenges"("userId", "expiresAt");
CREATE INDEX "mfa_challenges_consumedAt_idx" ON "mfa_challenges"("consumedAt");

ALTER TABLE "mfa_challenges"
ADD CONSTRAINT "mfa_challenges_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "mfa_trust_tokens" (
    "id" CHAR(24) NOT NULL,
    "userId" CHAR(24) NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "deviceIdHash" CHAR(64) NOT NULL,
    "ipHash" CHAR(64),
    "userAgentHash" CHAR(64),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mfa_trust_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mfa_trust_tokens_tokenHash_key" ON "mfa_trust_tokens"("tokenHash");
CREATE INDEX "mfa_trust_tokens_userId_expiresAt_idx" ON "mfa_trust_tokens"("userId", "expiresAt");
CREATE INDEX "mfa_trust_tokens_deviceIdHash_idx" ON "mfa_trust_tokens"("deviceIdHash");
CREATE INDEX "mfa_trust_tokens_revokedAt_idx" ON "mfa_trust_tokens"("revokedAt");

ALTER TABLE "mfa_trust_tokens"
ADD CONSTRAINT "mfa_trust_tokens_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
