# Agent State (shared)
- Branch: feat/agencies-controller
- Last: AgenciesController + Swagger UI /api/docs complete; typecheck/build/tests green.
- Last: GET /health + Swagger decorators + bruno/health/get-health.bru; AI router tested (smart-planner + fast-coder); bruno health 200.
- Next: Phase 5 document protection (after Phase 4 RLS review).
- Constraints: RLS + withTenant; tenantId from JWT only; no destructive DB cmds.
- Env: node/python/opencode/ollama available; ruff/claude/gemini/codex/kilo not.