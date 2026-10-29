-- One-time role and schema bootstrap. Run as the database/cluster administrator
-- before `prisma migrate deploy` or `prisma migrate reset`.
-- Passwords are deliberately not stored here; provision them from a secret
-- manager (or use provision-roles.ts, which generates ephemeral CI credentials).
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rihal_app') THEN
    EXECUTE 'CREATE ROLE rihal_app LOGIN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rihal_migrator') THEN
    EXECUTE 'CREATE ROLE rihal_migrator LOGIN';
  END IF;

  EXECUTE 'ALTER ROLE rihal_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS';
  EXECUTE 'ALTER ROLE rihal_migrator WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS';

  EXECUTE 'REVOKE rihal_migrator FROM rihal_app';
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO rihal_app', current_database());
  EXECUTE format('REVOKE CREATE ON DATABASE %I FROM rihal_app', current_database());
  EXECUTE format('GRANT CONNECT, CREATE, TEMPORARY ON DATABASE %I TO rihal_migrator', current_database());
  EXECUTE 'REVOKE CREATE ON SCHEMA public FROM PUBLIC';
  EXECUTE 'REVOKE CREATE ON SCHEMA public FROM rihal_app';
  EXECUTE 'GRANT USAGE ON SCHEMA public TO rihal_app';
  EXECUTE 'GRANT USAGE, CREATE ON SCHEMA public TO rihal_migrator';
  EXECUTE 'ALTER SCHEMA public OWNER TO rihal_migrator';
  EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE rihal_migrator IN SCHEMA public REVOKE ALL ON TABLES FROM rihal_app';
  EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE rihal_migrator IN SCHEMA public REVOKE ALL ON SEQUENCES FROM rihal_app';

  -- Runtime table/column grants are explicit in each reviewed migration.
  -- Do not add broad default privileges: newly introduced global tables must
  -- receive their own access policy before the application can use them.
END
$roles$;
