-- =============================================================================
-- Rihal — Row Level Security (RLS)
-- Defense in depth for multi-tenancy: even if an application query forgets
-- `WHERE tenant_id = ...`, PostgreSQL refuses to return another tenant's rows.
--
-- Apply with:
--   pnpm --filter @rihal/database db:rls
-- (or) psql "$DIRECT_URL" -f packages/database/prisma/sql/rls.sql
--
-- The application must connect with a role that does NOT own the tables and
-- does NOT have BYPASSRLS — e.g. `rihal_app` created at the bottom of this file.
-- Set the tenant per transaction:
--   BEGIN;
--   SELECT set_current_tenant('tenant_abc');
--   SELECT * FROM pilgrims;
--   COMMIT;
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper: tenant of the current transaction/session.
--    `missing_ok = true` → returns NULL instead of raising when unset, so
--    queries fail closed (empty result) rather than leak data.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_current_tenant()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.current_tenant', true), '');
$$;

-- Scoped to the current transaction (third argument = true → is_local).
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_id text)
RETURNS void
LANGUAGE sql
AS $$
  SELECT set_config('app.current_tenant', coalesce(tenant_id, ''), true);
$$;

-- ---------------------------------------------------------------------------
-- 2. Enable RLS on every tenant-owned table.
-- ---------------------------------------------------------------------------
ALTER TABLE tenants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilgrims      ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. Policies — one per table (DROP first so the script is re-runnable).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  USING (id = app_current_tenant())
  WITH CHECK (id = app_current_tenant());

DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

DROP POLICY IF EXISTS tenant_isolation ON pilgrims;
CREATE POLICY tenant_isolation ON pilgrims
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

DROP POLICY IF EXISTS tenant_isolation ON groups;
CREATE POLICY tenant_isolation ON groups
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

-- group_members has no tenant_id column: derive it from the parent group.
DROP POLICY IF EXISTS tenant_isolation ON group_members;
CREATE POLICY tenant_isolation ON group_members
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id
        AND g.tenant_id = app_current_tenant()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id
        AND g.tenant_id = app_current_tenant()
    )
  );

DROP POLICY IF EXISTS tenant_isolation ON documents;
CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

DROP POLICY IF EXISTS tenant_isolation ON invoices;
CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

DROP POLICY IF EXISTS tenant_isolation ON notifications;
CREATE POLICY tenant_isolation ON notifications
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

-- ---------------------------------------------------------------------------
-- 4. Application role.
--    Passwords are intentionally not set here: create the LOGIN role once
--    (per environment) and grant it membership of `rihal_app`.
--
--    CREATE ROLE rihal_app NOLOGIN;
--    CREATE ROLE rihal_api LOGIN PASSWORD '<secret>' IN ROLE rihal_app;
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO rihal_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rihal_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rihal_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rihal_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO rihal_app;

-- RLS is skipped for table owners, so make sure the API never runs as the
-- migration owner. Verify with:
--   SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;
