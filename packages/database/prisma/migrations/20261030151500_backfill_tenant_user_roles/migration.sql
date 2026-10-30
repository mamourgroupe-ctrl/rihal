-- The previous migration created compatibility roles, but its backfill query
-- ran after forced RLS was already enabled on users. Set each tenant context
-- before reading that tenant's users and assigning their matching role.
DO $backfill_user_roles$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT "id" FROM "tenants" LOOP
    PERFORM set_config('app.current_tenant_id', tenant_record."id", false);

    INSERT INTO "user_roles" ("tenantId", "userId", "roleId", "createdAt")
    SELECT user_record."tenantId", user_record."id", role."id", CURRENT_TIMESTAMP
    FROM "users" AS user_record
    JOIN "tenant_roles" AS role
      ON role."tenantId" = user_record."tenantId"
     AND role."code" = user_record."role"::text
    WHERE user_record."tenantId" = tenant_record."id"
    ON CONFLICT ("tenantId", "userId", "roleId") DO NOTHING;
  END LOOP;

  PERFORM set_config('app.current_tenant_id', '', false);
END
$backfill_user_roles$;
