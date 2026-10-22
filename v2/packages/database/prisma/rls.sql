-- Rihal v2 tenant isolation. Apply only to v2's separate PostgreSQL database.
-- Prerequisite: bootstrap-roles.sql, using trusted role-provisioning credentials.
-- This file is mirrored in the RLS migration; tests assert they stay identical.
-- RLS is not a substitute for authentication: the server alone selects tenant scope.
BEGIN;

DO $roles$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname = 'rihal_v2_platform_admin'
      AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls
      AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication
  ) THEN
    RAISE EXCEPTION 'Provision the restricted rihal_v2_platform_admin group before applying RLS';
  END IF;
END
$roles$;

ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tenants" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."people" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."people" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."trips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."trips" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."bookings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."groups" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."group_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."group_members" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."documents" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invoices" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."audit_logs" FORCE ROW LEVEL SECURITY;

-- The tenant registry is control-plane data, not accessible to agency employees.
-- A user role/HTTP claim/custom PostgreSQL GUC cannot grant this database role.
DROP POLICY IF EXISTS platform_admin_tenants ON "public"."tenants";
CREATE POLICY platform_admin_tenants ON "public"."tenants"
  FOR ALL TO rihal_v2_platform_admin
  USING (true)
  WITH CHECK (true);

-- Missing/unset/empty scope denies access, including after SET LOCAL is reset.
-- USING protects reads/update/delete targets; WITH CHECK protects inserts and
-- the new version of updated rows (including attempts to move a row's tenantId).
DROP POLICY IF EXISTS tenant_isolation_users ON "public"."users";
CREATE POLICY tenant_isolation_users ON "public"."users"
  FOR ALL
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_people ON "public"."people";
CREATE POLICY tenant_isolation_people ON "public"."people"
  FOR ALL
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_trips ON "public"."trips";
CREATE POLICY tenant_isolation_trips ON "public"."trips"
  FOR ALL
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_bookings ON "public"."bookings";
CREATE POLICY tenant_isolation_bookings ON "public"."bookings"
  FOR ALL
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_groups ON "public"."groups";
CREATE POLICY tenant_isolation_groups ON "public"."groups"
  FOR ALL
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_group_members ON "public"."group_members";
CREATE POLICY tenant_isolation_group_members ON "public"."group_members"
  FOR ALL
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_documents ON "public"."documents";
CREATE POLICY tenant_isolation_documents ON "public"."documents"
  FOR ALL
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_invoices ON "public"."invoices";
CREATE POLICY tenant_isolation_invoices ON "public"."invoices"
  FOR ALL
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_notifications ON "public"."notifications";
CREATE POLICY tenant_isolation_notifications ON "public"."notifications"
  FOR ALL
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

-- Audit records are append-only for RLS-subject roles, even the table owner.
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON "public"."audit_logs";
DROP POLICY IF EXISTS tenant_isolation_audit_logs_select ON "public"."audit_logs";
DROP POLICY IF EXISTS tenant_isolation_audit_logs_insert ON "public"."audit_logs";
CREATE POLICY tenant_isolation_audit_logs_select ON "public"."audit_logs"
  FOR SELECT
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_audit_logs_insert ON "public"."audit_logs"
  FOR INSERT
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

COMMIT;
