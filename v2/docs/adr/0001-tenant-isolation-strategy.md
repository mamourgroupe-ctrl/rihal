# ADR 0001: Tenant isolation and seasonal participation

- **Status:** Accepted for the v2 foundation
- **Date:** 2026-10-10
- **Scope:** The standalone `v2/` workspace and its separate PostgreSQL database

## Context

Rihal serves multiple agencies in a shared application. Identity, trip operations,
documents, finances, notifications, and audit records must never acquire accidental
cross-agency relationships or become visible through an omitted application filter.

Database connections may be reused by Prisma/driver pools and transaction-mode
connection proxies. A session-scoped setting is therefore not a request boundary.
An enabled RLS flag is also insufficient if a table owner bypasses it, a table has
no policy, the application connects with privileged credentials, or foreign keys
reference only a globally unique ID.

The v2 redesign is additive and isolated: no root v1 applications, packages,
configuration, or database are migrated by these commands.

## Decision

Use complementary layers, not an ORM filter alone:

1. An authentication/authorization guard supplies a verified principal with a
   tenant ID. The interceptor does not authenticate tokens or trust a client header.
2. Each finite tenant HTTP request uses one interactive Prisma transaction.
3. Set `app.current_tenant_id` with **SET LOCAL** on that transaction's connection.
4. Bind the transaction client to the async request context. All business services
   use `DatabaseService.client`, which refuses access outside an active transaction.
5. Enable **and force** PostgreSQL RLS on all 11 model tables.
6. Use composite foreign keys for every reference between tenant-owned records.
7. Access the tenant registry only through a separate platform-admin database role.

### SET LOCAL instead of SET

`SET app.current_tenant_id = ...` changes session state. A pooled connection can
outlive the request and expose that stale scope to a subsequent borrower. Resetting
it manually is error-prone on exceptions, cancellation, and pool/proxy behavior.

`SET LOCAL app.current_tenant_id = ...` lasts only until the surrounding transaction
commits or rolls back. Every statement in that transaction uses the pinned
connection; another transaction must explicitly establish its own scope.

`setLocalTenantId()` executes the actual `SET LOCAL` statement. PostgreSQL does not
accept value bind parameters in `SET`, so the complete tenant ID is allowlisted as
an opaque ASCII identifier of 1–128 characters (CUID, UUID, or synthetic fixture
ID) before it is interpolated into a quoted literal. Quotes, backslashes,
whitespace, oversized IDs, and empty values are rejected. Do not change this to
unvalidated raw SQL. Parameterized `set_config('app.current_tenant_id', value,
true)` is an equivalent transaction-local alternative; `false` is **not** equivalent.

Policies compare `tenantId` against
`NULLIF(current_setting('app.current_tenant_id', true), '')`. Both a missing setting
and the empty value left after a local setting is reset deny access.

### Transaction propagation and HTTP lifecycle

Opening a transaction does not automatically redirect Prisma calls made on a
separate singleton. The database service encapsulates the root client and exposes
only the current transaction client to business services using `AsyncLocalStorage`.
A nested transaction is rejected; an inner service uses the existing client.
The scope is marked inactive on completion, including for detached promises/timers
that retain an async context.

The interceptor starts on subscription and emits the result only after COMMIT
succeeds. Handler errors, Observable unsubscription, and a 10-second finite-handler
deadline reject the callback and trigger rollback. The Prisma transaction has a
15-second timeout and a 5-second pool wait limit. This is not an SSE, WebSocket,
streaming-response, or long-running job interceptor. Observable cancellation is
the supported cancellation boundary; HTTP adapters must propagate transport aborts
if they require disconnect-driven cancellation.

External side effects cannot be rolled back by PostgreSQL. Keep requests short;
use a separately designed transactional outbox for eventual notifications/jobs.
Do not perform file streaming or slow external API calls inside this transaction.

### ENABLE and FORCE RLS

`ENABLE ROW LEVEL SECURITY` makes ordinary roles subject to policies.
`FORCE ROW LEVEL SECURITY` additionally subjects the normal table owner to them.
Both flags are set on `tenants`, `users`, `people`, `trips`, `bookings`, `groups`,
`group_members`, `documents`, `invoices`, `notifications`, and `audit_logs`.

Normal data policies specify both:

- `USING`: visible/selectable rows and update/delete targets.
- `WITH CHECK`: permitted inserted rows and new versions of updated rows.

The join table has its own tenant column and policy. Audit logs intentionally have
only tenant-scoped SELECT and INSERT policies: they are append-only for RLS-subject
roles, including the normal owner. All policy creation is preceded by the matching
`DROP POLICY IF EXISTS`. The standalone SQL runs atomically and is mirrored in a
checked-in migration; a test prevents the two copies from drifting.

**Limits:** PostgreSQL superusers and `BYPASSRLS` roles bypass even FORCE. Owners
can alter/disable policies, and RLS does not constrain TRUNCATE. Consequently the
runtime role must be non-owner, NOSUPERUSER, NOBYPASSRLS, without privileged role
memberships or TRUNCATE grants. It must not be a platform-admin role. API startup
checks those properties and the presence of ENABLE/FORCE/policies on every model
table. Trusted infrastructure/migration administrators remain outside this threat
boundary; FORCE is defense against accidental owner reads/writes, not malicious DDL.

### Tenant registry: platform-admin only

`tenants` is control-plane data. Its policy is `FOR ALL TO
rihal_v2_platform_admin USING (true) WITH CHECK (true)` rather than trusting a
user-supplied `app.is_platform_admin` setting or an application `UserRole.ADMIN`.

`bootstrap-roles.sql` provisions that group as NOLOGIN, NOSUPERUSER, NOBYPASSRLS,
without role/database creation or replication privileges. Provisioning and
membership assignment require a separately trusted administrative account.
The bootstrap refuses a preexisting group with unsafe attributes rather than
silently weakening policy behavior.

Grant membership only to a separately secured control-plane login, never to the
tenant API's login. That login/group also needs normal PostgreSQL grants on the
registry; a policy is not a privilege grant. Platform-admin membership does not
implicitly bypass the other data tables' tenant policies. Auth/control-plane code
owns tenant lifecycle checks and supplies the verified tenant principal.

### Composite foreign keys

A global `id` plus separate `tenantId` fields does not prevent linking an A-owned
row to a B-owned parent. RLS checks the child row's scope, and PostgreSQL foreign
key validation does not act as a tenant authorization check.

Every tenant-owned parent has `@@unique([id, tenantId])`, and relationships use
both columns. In particular:

- Booking `(personId, tenantId)` → Person `(id, tenantId)`.
- Booking `(tripId, tenantId)` → Trip `(id, tenantId)`.
- Group `(tripId, tenantId)` → Trip `(id, tenantId)`.
- GroupMember `(groupId, tripId, tenantId)` → Group `(id, tripId, tenantId)`.
- GroupMember `(bookingId, tripId, tenantId)` → Booking `(id, tripId, tenantId)`.

The shared trip ID also rejects a wrong-trip membership within the **same** tenant.
Documents use a person-scoped composite booking key when attached to a booking.
Uploaders, verifiers, invoice bookings, notification recipients/bookings, and audit
actors are likewise tenant-scoped. Nullable references still include the non-null
tenant key; absence of an optional relationship is allowed, not an unscoped link.

Direct references to Tenant use its global primary key; there is no second tenant
column on Tenant itself. `AuditLog.resourceKey` is explicitly descriptive and
polymorphic, not a foreign key that disappears with its audited resource.

### Person / Trip / Booking separation

- **Person:** reusable identity/contact information only, no journey status.
- **Trip:** the seasonal journey, schedule, and journey-level state.
- **Booking:** one person's participation in one trip, including its status and
  reference. A person can participate in different trips without overwriting history.
- **Group:** belongs to a trip; members reference bookings in that same trip.
- **Document:** belongs to a person and may also belong to that person's booking.
- **Invoice:** belongs to a booking; it is not the SaaS subscription invoice.

Restrictive deletes preserve core/financial/audit relationships. Only operational
membership edges cascade from deleted groups/bookings. Archival/lifecycle policies,
fiscal compliance, full invoicing, and authentication flows are separate work.

## Deployment boundary

Use a new v2 database, not the v1 DATABASE_URL. Supply runtime and migration
connections explicitly; committed environment values are placeholders only.

1. Provision the restricted platform-admin group using `bootstrap-roles.sql`.
2. Apply both checked-in migrations with the schema-owner/migration connection.
3. Grant the runtime login USAGE on `public` and only required table DML; never
   grant ownership, platform-admin membership, TRUNCATE, or migration-table access.
4. Grant registry privileges and group membership to a secured control-plane login.
5. Initialize `TenantDatabaseModule`; its lifecycle checks must pass before serving
   requests. Verified guards precede opt-in `TenantInterceptor` use.

Prisma validation/generation use bundled WASM and do not connect to a database.
Prisma 6 production migration commands retain the classic schema engine and need
its native binary available. The disposable integration harness applies the actual
migration SQL with node-postgres; it does **not** claim to validate native Prisma
`migrate deploy` execution or a production connection proxy.

## Verification

Vitest starts an isolated PostgreSQL 16 cluster on a random loopback port using
synthetic fixture records and no passwords. It ignores external database URLs,
creates separate runtime, owner, and platform-admin connections, applies the SQL
migrations, and stops/removes the cluster on completion. No test databases or
client/build outputs are committed. Tests cover:

- Every table's ENABLE/FORCE flags, policies, and actual ownership.
- Full schema-parser FK metadata against the deployed 25 foreign keys.
- Cross-tenant SELECT (hidden rows), INSERT (42501), UPDATE and DELETE.
- Cross-tenant relationships (23503), including GroupMember/Document edge cases.
- Valid same-tenant operations, repeated trips, and missing/empty scope denial.
- FORCE enforcement using a real non-superuser, NOBYPASSRLS table owner.
- Registry access via database role membership, not a spoofable GUC.
- Audit append-only behavior and runtime TRUNCATE denial.
- SET LOCAL reset after both COMMIT and ROLLBACK on the same pooled connection.
- Real Prisma request isolation, commit/rollback, cancellation, concurrency,
  detached contexts, and rejection of privileged/incompletely protected startup.

Only finite-handler timing/response-boundary tests stub transaction completion;
the actual RLS and foreign-key tests are not mocks. The test harness removes the
embedded server library's normal-exit hooks (which otherwise replace a failing
runner's exit code with zero), retains signal cleanup, and lets Vitest own normal
teardown. An intentional temporary failing test verified a nonzero runner status.

## Consequences and residual responsibilities

Composite indexes/storage and transaction-per-request add overhead; handlers must
remain bounded, and pool sizing needs workload-specific testing. Platform registry
lookups require a distinct control-plane path. Background jobs need trusted tenant
context and their own transaction boundary.

RLS isolates tenant rows, not user permissions within a tenant, external object
storage, caches, exports, or side effects. An SQL-injected/compromised runtime
connection can choose another custom GUC value; authenticate tenants and always
parameterize application queries. The v2 foundation is not a completed security
certification, authentication system, fiscal implementation, or data-retention
policy. Future tenant-owned tables must gain composite keys, ENABLE/FORCE RLS,
explicit policies, and corresponding tests in the same change.
