# Security Review & Threat Model (Phase 2 Gate)

**Status:** Draft (Pending Human Sign-off)
**Date:** 2026-11-01

## 1. Scope
This document outlines the security requirements and threat model for the Rihal API MVP. It acts as a gate before implementing sensitive features (document storage, real data).

## 2. Provider Decisions (TBD)
- **Database:** Managed PostgreSQL (compatible with `rihal_app` and `rihal_migrator` roles). TBD in Phase 3.
- **Storage:** S3-compatible bucket (AWS S3, Cloudflare R2, or MinIO for dev). Private access only. TBD in Phase 3.
- **Email (SMTP):** Transactional email provider (Resend/Brevo). TBD in Phase 3.

## 3. Authentication & Authorization
- **JWT Custom Auth:** Access tokens (short-lived) + Refresh tokens (rotation). Handled via `AuthController`.
- **RBAC:** Enforced via `RolesGuard` and `@Roles()` decorators. 
- **Tenant Isolation:** Enforced at the database level via Row-Level Security (RLS). The runtime role (`rihal_app`) cannot bypass RLS.

## 4. Row-Level Security (RLS) Requirements
- The database connection for the application MUST use the `rihal_app` role.
- `rihal_app` must NOT have `SUPERUSER`, `BYPASSRLS`, or `CREATEROLE` attributes.
- Migration/admin tasks MUST use the `rihal_migrator` role.
- All tenant-scoped tables must have RLS `FORCE` enabled.

## 5. Document Storage Security
- Files must be stored in a private bucket (no public read access).
- File downloads must be authorized via the API (checking tenant and role) before issuing a pre-signed URL.
- File names/paths must be randomized (UUIDs) to prevent guessing.

## 6. Secrets & Configuration
- No secrets in code. All configuration via environment variables (`.env`).
- `DATABASE_URL`, `DIRECT_URL`, and JWT secrets are required in production.
- CORS is strictly enforced in production (HTTPS only, explicit allowlist).

## 7. Remaining Risks & Mitigations (For Phase 3+)
- **In-memory Rate Limiting:** Currently used. Mitigation: Migrate to Redis in Phase 7.
- **No background worker:** Email outbox relies on app-level cron. Mitigation: Redis/BullMQ in Phase 7.
- **Audit Logs:** Design approved (see `decisions.md`), implementation in Phase 4.
- **Error Responses:** Must not leak stack traces or SQL errors in production. Design approved, implementation in Phase 4.

## 8. Security Sign-off
- [ ] Project Owner: _______________________ (Date: ______)
- [ ] Tech Lead: __________________________ (Date: ______)
