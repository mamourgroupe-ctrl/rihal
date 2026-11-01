-- Run ONCE (or re-run safely) using a trusted role-provisioning account before
-- migrations. No passwords/logins or membership grants are created here.
-- Explicitly grant this group only to a separately secured platform-admin login.
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rihal_v2_platform_admin') THEN
    CREATE ROLE rihal_v2_platform_admin NOLOGIN NOSUPERUSER NOCREATEDB
      NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname = 'rihal_v2_platform_admin'
      AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication)
  ) THEN
    RAISE EXCEPTION 'rihal_v2_platform_admin must be an unprivileged NOLOGIN, NOBYPASSRLS group';
  END IF;
END
$roles$;
