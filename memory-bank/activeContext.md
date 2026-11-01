# Active Context

## Current task

- Branch `feat/agencies-controller`: agencies subscription endpoints — IMPLEMENTED.
- `AgenciesController` (`/api/agencies/subscription`): GET current, GET list, POST create, PATCH :id update. `tenantId` via `@CurrentTenantId()` (JWT claims). OpenAPI decorators added via `@nestjs/swagger`.
- `AgenciesService`: `listSubscriptions`, `getCurrentSubscription`, `createSubscription`, `updateSubscription`. All use `PrismaService.withRequestTenant`.
- `@nestjs/swagger` ^11.4.7 added (compatible with NestJS 11).
- Phase 2 infrastructure commits 1-9 complete (security review, RLS negative tests, gitleaks, husky/lint-staged, CI, docker-compose, README, Dockerfile, release workflow).
- Frontend scaffolded in `apps/web` (Next.js 16, Tailwind, React Query, axios). Landing page + metadata updated.

## Recently modified files

- `apps/api/src/agencies/agencies.controller.ts` (added list/update routes + Swagger decorators)
- `apps/api/src/main.ts` (wired Swagger UI at `/api/docs` with Bearer auth)
- `apps/api/package.json` (added @nestjs/swagger)
- `bruno/` (collection, environment, 4 .bru request files)
- `memory-bank/*` (created)
- `.clinerules/*` (memory bank + Bruno CLI rules + frontend rules)
- `docs/security-review.md`, `docs/decisions.md` (Phase 2 design docs)
- `apps/api/test/rls.negative.test.ts`
- `.github/workflows/gitleaks.yml`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`
- `package.json`, `pnpm-lock.yaml`, `.husky/pre-commit` (husky + lint-staged)
- `docker-compose.yml`, `apps/api/Dockerfile`, `.dockerignore`
- `apps/web/` (Next.js 15/16 scaffold)

## Verification

- `pnpm --filter @rihal/api typecheck` ✅ passed
- `pnpm --filter @rihal/api test` ✅ 30 passed, 13 skipped
- `pnpm --filter @rihal/api build` ✅ passed
- `pnpm --filter web build` ✅ passed
- `pnpm lint` ❌ could not run (eslint hangs in this environment; not a code issue)
- Bruno CLI not installed locally; `.bru` files created but not executed.

## Open items / risks

- Swagger UI wired at `/api/docs` with Bearer auth ✅.
- `subscriptionPlan` is global catalog (no tenantId) — confirmed; no filter needed.
- Phase 4 (RLS) PR #13 open, pending human security review; do not merge/start phases 5-7 until review completes.
- Phases 0-3 complete.
- Docker Desktop daemon not running locally; `docker compose up -d` pending.

## Next logical step

- Wire API client in web app (axios + React Query) to agencies subscription endpoints.
- Add controller-level tests if desired.
- Begin Phase 5 (Document protection) after Phase 4 review.
