<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

---

# قواعد العمل في رحّال (لكل وكلاء البرمجة)

اقرأ `.github/copilot-instructions.md` — هو المرجع الملزم.

- الخريطة: `apps/api` (NestJS + واجهة ثابتة في `public/`)، `apps/mobile` (Capacitor)،
  `packages/database` (Prisma + RLS)، `tooling/` (فحص وتهيئة البيئة)، `docs/`.
- قبل أي عمل: `node tooling/doctor.mjs`، وقبل أي دفع: `pnpm lint && pnpm typecheck && pnpm test`.
- العزل: `tenantId` من سياق المصادقة فقط، وRLS مفروض في القاعدة. لا استعلام بلا سياق مستأجر.
- الكتابة: ADMIN/OPERATOR/SUPERVISOR؛ إدارة المستخدمين: ADMIN؛ الانتقالات غير المسموحة = 409.
- لا أسرار في المستودع، ولا بيانات حقيقية في البذور، ولا بناء iOS مُدَّعى على Windows.
- التخصصات: `.github/chatmodes/*.chatmode.md` (معماري، backend، database، android، ios، qa، security، reviewer).
- التوثيق بالعربية في `docs/`؛ الأسماء البرمجية بالإنجليزية.
