-- PostgreSQL row-level security for every table that stores tenantId.
-- Run through a formal Prisma migration after provisioning rihal_app and
-- rihal_migrator with prisma/roles-bootstrap.sql.

DO $rls_roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rihal_app') THEN
    RAISE EXCEPTION 'Required role rihal_app is missing; run roles-bootstrap.sql first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rihal_migrator') THEN
    RAISE EXCEPTION 'Required role rihal_migrator is missing; run roles-bootstrap.sql first';
  END IF;
  IF current_user <> 'rihal_migrator' THEN
    RAISE EXCEPTION 'Run tenant RLS migrations using the separate rihal_migrator role';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname IN ('rihal_app', 'rihal_migrator')
      AND (rolsuper OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'Application and migration roles must not be superusers or bypass RLS';
  END IF;
  IF pg_has_role('rihal_app', 'rihal_migrator', 'MEMBER') THEN
    RAISE EXCEPTION 'The runtime role must not be a member of the migration role';
  END IF;
END
$rls_roles$;

-- The runtime role can resolve a tenant by slug during public authentication,
-- but tenant administration remains with the migration/provisioning role.
GRANT USAGE ON SCHEMA public TO rihal_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM rihal_app;
REVOKE ALL PRIVILEGES ON TABLE "tenants" FROM rihal_app;
GRANT SELECT ("id", "slug", "status", "archivedAt") ON TABLE "tenants" TO rihal_app;

-- Application data access is always subject to RLS. Physical DELETE is not
-- granted to the app role; domain records are archived instead.
REVOKE ALL PRIVILEGES ON TABLE
  "users",
  "pilgrims",
  "groups",
  "group_members",
  "documents",
  "invoices",
  "invoice_items",
  "notifications",
  "auth_sessions",
  "refresh_tokens",
  "password_reset_tokens"
FROM rihal_app;
GRANT SELECT, INSERT, UPDATE ON TABLE
  "users",
  "pilgrims",
  "groups",
  "group_members",
  "documents",
  "invoices",
  "invoice_items",
  "notifications",
  "auth_sessions",
  "refresh_tokens",
  "password_reset_tokens"
TO rihal_app;

-- FORCE is essential: the table owner (the separate migration role) is also
-- subject to the policies. The migration role has a policy only so the seed
-- can work tenant-by-tenant with SET LOCAL, not to grant cross-tenant access.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "pilgrims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pilgrims" FORCE ROW LEVEL SECURITY;
ALTER TABLE "groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "groups" FORCE ROW LEVEL SECURITY;
ALTER TABLE "group_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "group_members" FORCE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" FORCE ROW LEVEL SECURITY;
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;
ALTER TABLE "invoice_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
ALTER TABLE "auth_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth_sessions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" FORCE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" FORCE ROW LEVEL SECURITY;

-- Re-running this reference script is safe; the official migration is applied
-- once by Prisma and contains the same policies.
DROP POLICY IF EXISTS tenant_isolation_users ON "users";
DROP POLICY IF EXISTS tenant_isolation_pilgrims ON "pilgrims";
DROP POLICY IF EXISTS tenant_isolation_groups ON "groups";
DROP POLICY IF EXISTS tenant_isolation_group_members ON "group_members";
DROP POLICY IF EXISTS tenant_isolation_documents ON "documents";
DROP POLICY IF EXISTS tenant_isolation_invoices ON "invoices";
DROP POLICY IF EXISTS tenant_isolation_invoice_items ON "invoice_items";
DROP POLICY IF EXISTS tenant_isolation_notifications ON "notifications";
DROP POLICY IF EXISTS tenant_isolation_auth_sessions ON "auth_sessions";
DROP POLICY IF EXISTS tenant_isolation_refresh_tokens ON "refresh_tokens";
DROP POLICY IF EXISTS tenant_isolation_password_reset_tokens ON "password_reset_tokens";

CREATE POLICY tenant_isolation_users ON "users"
  FOR ALL TO rihal_app, rihal_migrator
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

CREATE POLICY tenant_isolation_pilgrims ON "pilgrims"
  FOR ALL TO rihal_app, rihal_migrator
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

CREATE POLICY tenant_isolation_groups ON "groups"
  FOR ALL TO rihal_app, rihal_migrator
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

CREATE POLICY tenant_isolation_group_members ON "group_members"
  FOR ALL TO rihal_app, rihal_migrator
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

CREATE POLICY tenant_isolation_documents ON "documents"
  FOR ALL TO rihal_app, rihal_migrator
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

CREATE POLICY tenant_isolation_invoices ON "invoices"
  FOR ALL TO rihal_app, rihal_migrator
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

CREATE POLICY tenant_isolation_invoice_items ON "invoice_items"
  FOR ALL TO rihal_app, rihal_migrator
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

CREATE POLICY tenant_isolation_notifications ON "notifications"
  FOR ALL TO rihal_app, rihal_migrator
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

CREATE POLICY tenant_isolation_auth_sessions ON "auth_sessions"
  FOR ALL TO rihal_app, rihal_migrator
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

-- Opaque refresh/reset tokens are looked up before a user is authenticated.
-- The app may read only the row whose SHA-256 token hash it possesses. Writes
-- still require an authenticated tenant context in WITH CHECK.
CREATE POLICY tenant_isolation_refresh_tokens ON "refresh_tokens"
  FOR ALL TO rihal_app, rihal_migrator
  USING (
    "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')
    OR "tokenHash" = NULLIF(current_setting('app.refresh_token_hash', true), '')
  )
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

CREATE POLICY tenant_isolation_password_reset_tokens ON "password_reset_tokens"
  FOR ALL TO rihal_app, rihal_migrator
  USING (
    "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')
    OR "tokenHash" = NULLIF(current_setting('app.password_reset_token_hash', true), '')
  )
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));
