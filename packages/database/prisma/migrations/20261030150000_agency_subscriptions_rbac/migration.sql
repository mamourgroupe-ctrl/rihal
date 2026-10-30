-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "billingInterval" "BillingInterval" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionPlanId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "tenant_roles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "tenant_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_role_permissions" (
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_role_permissions_pkey" PRIMARY KEY ("tenantId","roleId","permissionCode")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("tenantId","userId","roleId")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE INDEX "agency_subscriptions_tenantId_status_idx" ON "agency_subscriptions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "agency_subscriptions_tenantId_currentPeriodEnd_idx" ON "agency_subscriptions"("tenantId", "currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "agency_subscriptions_tenantId_id_key" ON "agency_subscriptions"("tenantId", "id");

-- CreateIndex
CREATE INDEX "tenant_roles_tenantId_archivedAt_idx" ON "tenant_roles"("tenantId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_roles_tenantId_id_key" ON "tenant_roles"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_roles_tenantId_code_key" ON "tenant_roles"("tenantId", "code");

-- CreateIndex
CREATE INDEX "tenant_role_permissions_tenantId_permissionCode_idx" ON "tenant_role_permissions"("tenantId", "permissionCode");

-- CreateIndex
CREATE INDEX "user_roles_tenantId_roleId_idx" ON "user_roles"("tenantId", "roleId");

-- AddForeignKey
ALTER TABLE "agency_subscriptions" ADD CONSTRAINT "agency_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_subscriptions" ADD CONSTRAINT "agency_subscriptions_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_roles" ADD CONSTRAINT "tenant_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_role_permissions" ADD CONSTRAINT "tenant_role_permissions_tenantId_roleId_fkey" FOREIGN KEY ("tenantId", "roleId") REFERENCES "tenant_roles"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_role_permissions" ADD CONSTRAINT "tenant_role_permissions_permissionCode_fkey" FOREIGN KEY ("permissionCode") REFERENCES "permissions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "users"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenantId_roleId_fkey" FOREIGN KEY ("tenantId", "roleId") REFERENCES "tenant_roles"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- This migration changes runtime grants and tenant isolation policies.
DO $migration_role$
BEGIN
  IF current_user <> 'rihal_migrator' THEN
    RAISE EXCEPTION 'Run agency subscription and RBAC migrations using rihal_migrator';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rihal_app')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rihal_migrator') THEN
    RAISE EXCEPTION 'Required application or migration role is missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname IN ('rihal_app', 'rihal_migrator')
      AND (rolsuper OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'Application and migration roles must not bypass RLS';
  END IF;
  IF pg_has_role('rihal_app', 'rihal_migrator', 'MEMBER') THEN
    RAISE EXCEPTION 'The runtime role must not be a member of the migration role';
  END IF;
END
$migration_role$;

-- Preserve the existing enum role while preparing tenant-scoped role assignments.
INSERT INTO "tenant_roles" (
  "id", "tenantId", "code", "name", "isSystem", "createdAt", "updatedAt"
)
SELECT
  'legacy_' || md5(tenant."id" || ':' || role."code"),
  tenant."id",
  role."code",
  role."name",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "tenants" AS tenant
CROSS JOIN (
  VALUES
    ('ADMIN', 'Administrator'),
    ('OPERATOR', 'Operator'),
    ('SUPERVISOR', 'Supervisor'),
    ('VIEWER', 'Viewer')
) AS role("code", "name")
ON CONFLICT ("tenantId", "code") DO NOTHING;

INSERT INTO "user_roles" ("tenantId", "userId", "roleId", "createdAt")
SELECT
  user_record."tenantId",
  user_record."id",
  role."id",
  CURRENT_TIMESTAMP
FROM "users" AS user_record
JOIN "tenant_roles" AS role
  ON role."tenantId" = user_record."tenantId"
 AND role."code" = user_record."role"::text
ON CONFLICT ("tenantId", "userId", "roleId") DO NOTHING;

-- Global catalogs are visible to the runtime role but writable only by migrations.
REVOKE ALL PRIVILEGES ON TABLE "subscription_plans", "permissions" FROM rihal_app;
GRANT SELECT ON TABLE "subscription_plans", "permissions" TO rihal_app;

-- Tenant-owned records remain subject to RLS; physical deletion is not granted.
REVOKE ALL PRIVILEGES ON TABLE
  "agency_subscriptions",
  "tenant_roles",
  "tenant_role_permissions",
  "user_roles"
FROM rihal_app;
GRANT SELECT, INSERT, UPDATE ON TABLE
  "agency_subscriptions",
  "tenant_roles",
  "tenant_role_permissions",
  "user_roles"
TO rihal_app;

ALTER TABLE "agency_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agency_subscriptions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tenant_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_roles" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tenant_role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_role_permissions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_roles" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_agency_subscriptions ON "agency_subscriptions"
  FOR ALL TO rihal_app, rihal_migrator
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

CREATE POLICY tenant_isolation_tenant_roles ON "tenant_roles"
  FOR ALL TO rihal_app, rihal_migrator
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

CREATE POLICY tenant_isolation_tenant_role_permissions ON "tenant_role_permissions"
  FOR ALL TO rihal_app, rihal_migrator
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

CREATE POLICY tenant_isolation_user_roles ON "user_roles"
  FOR ALL TO rihal_app, rihal_migrator
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));
