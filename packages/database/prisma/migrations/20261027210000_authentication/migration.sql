-- Persist revocable login sessions and one-use refresh/password recovery tokens.
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "auth_sessions_tenantId_userId_fkey"
      FOREIGN KEY ("tenantId", "userId") REFERENCES "users"("tenantId", "id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "auth_sessions_tenantId_userId_revokedAt_idx"
  ON "auth_sessions"("tenantId", "userId", "revokedAt");
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refresh_tokens_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "auth_sessions"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
CREATE INDEX "refresh_tokens_sessionId_expiresAt_idx"
  ON "refresh_tokens"("sessionId", "expiresAt");

CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "password_reset_tokens_tenantId_userId_fkey"
      FOREIGN KEY ("tenantId", "userId") REFERENCES "users"("tenantId", "id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key"
  ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_tenantId_userId_expiresAt_idx"
  ON "password_reset_tokens"("tenantId", "userId", "expiresAt");
