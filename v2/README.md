# Rihal v2 foundation

This is an independent workspace. All v2 source, dependencies, documentation,
commands, and test fixtures live here; root v1 applications/packages are untouched.

## Requirements

- Node.js 22+
- pnpm 9.15.0 (or `corepack pnpm`)

Run commands from this directory, **not** the repository root:

```sh
cd v2
pnpm install --frozen-lockfile
pnpm db:validate
pnpm db:generate
pnpm build
pnpm check
```

Only placeholder connection strings are committed. Validation and client
creation do not require a running database. Database writes must always use
explicitly configured connections, never the placeholder fallback.

The integration test suite starts a disposable PostgreSQL 16 instance on a
random loopback port. It never connects to `DATABASE_URL`/`DIRECT_URL` from the
shell and uses synthetic records only.

This foundation is not a replacement for v1 and is not a production
authentication system. Tenant scope must come from a verified authenticated
principal, not from request headers/body/query parameters.
