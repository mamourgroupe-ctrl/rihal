# Rihal v2: hardened multi-tenant foundation

An independent pnpm workspace. All v2 source, configuration, dependencies,
migrations, documentation, and fixtures live here. Root v1 `apps/`, `packages/`,
workspace files, CI, and database are untouched. Use a **separate v2 database**.

## Requirements and checks

- Node.js 22.12+ in the 22.x LTS line, or Node.js 24+
- pnpm 9.15.0 available on PATH (enable a Corepack shim if necessary)
- A non-root OS user for the disposable PostgreSQL test process

Run from **this directory**, not the repository root:

```sh
cd v2
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm audit --audit-level moderate
```

`check` validates the schema, generates the client, builds the database dependency,
type-checks both packages/tests, and runs Vitest. It works without existing build
outputs or a running database. Parser-only Prisma commands use bundled WASM;
client queries use the JavaScript PostgreSQL adapter, not a native query engine.
The pinned test framework and the CLI's `deepmerge-ts` override avoid known
advisories; keep the override until the pinned Prisma CLI supports the patched
version without it, and rerun checks when changing dependencies.

The tests start a disposable PostgreSQL 16 cluster on a random loopback port. They
never use database URLs from the shell, create synthetic records only, run using
separate ordinary runtime/owner/platform roles, and remove the cluster afterward.
They apply the checked-in SQL migrations; native Prisma migration-engine execution
and production proxies are not exercised by this local suite.

## Delivered structure

```text
packages/database/
  prisma/schema.prisma          # 11 separated, tenant-scoped models
  prisma/bootstrap-roles.sql    # restricted NOLOGIN platform-admin group
  prisma/rls.sql                # ENABLE + FORCE + complete/idempotent policies
  prisma/migrations/            # deployable schema and RLS SQL
  src/                         # explicit Prisma factory + safe SET LOCAL helper
  __tests__/rls.test.ts         # real PostgreSQL isolation and FK tests
apps/api/
  src/common/interceptors/tenant.interceptor.ts
  src/database/                # request transaction context + startup safeguards
  __tests__/tenant.interceptor.test.ts
docs/adr/0001-tenant-isolation-strategy.md
```

See [ADR 0001](docs/adr/0001-tenant-isolation-strategy.md) for isolation guarantees,
role boundaries, pooling behavior, and limitations.

## Deploying to a separately provisioned v2 database

There are no real credentials or customer data in this workspace. `.env.example`
contains placeholders only. Environment files are ignored and are **not**
automatically loaded by the Prisma config: supply environment variables through
your shell or deployment secret manager.

1. Provision a v2 database, a schema-owner/migrator, and a separate unprivileged
   runtime login. Do not point at the existing v1 database.
2. With a trusted role-provisioning account, apply
   `packages/database/prisma/bootstrap-roles.sql`. This only creates a restricted
   group, not logins, passwords, or membership grants.
3. Set `DATABASE_URL` to the runtime connection and `DIRECT_URL` to the
   owner/migrator's direct connection, then run:

   ```sh
   pnpm db:deploy
   ```

   Migration operations reject missing connections; they never use the placeholder
   fallback. Production deployment uses Prisma 6's classic schema engine, whose
   native binary must be available (unlike validation/client generation).
4. Grant the runtime login USAGE on `public`, required SELECT/INSERT/UPDATE/DELETE
   on `users`, `people`, `trips`, `bookings`, `groups`, `group_members`, `documents`,
   `invoices`, and `notifications`, and SELECT/INSERT on `audit_logs`. Do not grant
   ownership, privileged memberships, TRUNCATE, schema creation, or access to
   `_prisma_migrations`. Normal tenant runtime does not need registry privileges.
5. Give a separately secured control-plane login membership in
   `rihal_v2_platform_admin` plus USAGE on `public` and required DML on `tenants`.
   Do not give the tenant runtime that membership. Policies do not grant privileges.
6. Initialize `TenantDatabaseModule` in the v2 API. Startup rejects privileged
   credentials and missing/incomplete ENABLE/FORCE RLS protection.

The root GitHub Actions workflow was intentionally not changed. It does not run
these v2 checks yet; adding an automatic workflow requires permission to edit
outside `v2/`. Run the commands above in an approved CI workflow when available.

## Using the interceptor

This package provides a foundation module, not a new public server or a production
authentication implementation. Import `TenantDatabaseModule` in the protected
feature module and apply `TenantInterceptor` only to finite, authenticated HTTP
handlers. A verified guard must first populate `request.user.tenantId`, verify
membership/account/tenant lifecycle, and perform within-tenant authorization.
Client headers, query strings, and bodies cannot choose the scope.

Every downstream business service reads/writes through **`DatabaseService.client`**:

```ts
// Inside an authenticated handler covered by TenantInterceptor:
return this.database.client.booking.findMany();
```

Do not construct a second Prisma singleton inside a handler: it does not share the
request transaction. Direct client access outside the active async context throws.
The response is emitted only after commit; errors, Observable cancellation, and
finite-handler deadline expiry roll back. Public/auth/control-plane endpoints,
SSE/WebSockets, long-running jobs, file streams, and external side effects need
separate, explicitly designed boundaries.
