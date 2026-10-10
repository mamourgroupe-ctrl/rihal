-- ============================================================
-- RLS (Row-Level Security) Policies for Rihal
-- Multi-tenant isolation: every query is scoped to tenant_id
-- ============================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE "pilgrims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "group_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS tenant_isolation_pilgrims ON "pilgrims";
DROP POLICY IF EXISTS tenant_isolation_groups ON "groups";
DROP POLICY IF EXISTS tenant_isolation_documents ON "documents";
DROP POLICY IF EXISTS tenant_isolation_invoices ON "invoices";
DROP POLICY IF EXISTS tenant_isolation_notifications ON "notifications";
DROP POLICY IF EXISTS tenant_isolation_users ON "users";

-- Create policies: only rows matching the current tenant
CREATE POLICY tenant_isolation_pilgrims ON "pilgrims"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_groups ON "groups"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_documents ON "documents"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_invoices ON "invoices"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_notifications ON "notifications"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_users ON "users"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));