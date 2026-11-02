# CLAUDE.md — رحّال

> المرجع الملزم لكل وكلاء البرمجة في هذا المستودع هو
> **`.github/copilot-instructions.md`** (وملفات `.github/instructions/` حسب المسار).
> اقرأه أولًا. هذا الملف يضيف ما يخصّ Claude Code فقط.

## ما هو المشروع
منصة SaaS متعددة المستأجرين لإدارة عمليات وكالات الحج والعمرة.
`apps/api` (NestJS 11 + واجهة ثابتة في `public/`)، `apps/mobile` (Capacitor: أندرويد/iOS)،
`packages/database` (Prisma 6 + RLS)، `tooling/` (فحص وتهيئة البيئة)، `docs/`.

## أوامر لا تتجاوزها
```bash
node tooling/doctor.mjs                                    # حالة البيئة أولًا
corepack pnpm lint && corepack pnpm typecheck && corepack pnpm test
corepack pnpm android:prepare && corepack pnpm android:sync && corepack pnpm android:apk
```

## القواعد الحاسمة (باختصار)
1. `tenantId` من سياق المصادقة فقط — لا من `body`/`query`.
2. كل جدول مجال: `tenantId` + `ENABLE`/`FORCE ROW LEVEL SECURITY` + سياسة `WITH CHECK`.
3. الكتابة: ADMIN/OPERATOR/SUPERVISOR؛ إدارة المستخدمين: ADMIN. الانتقال غير المسموح = 409 لا 500.
4. الحذف = أرشفة (`archivedAt`). لا `delete` فعلي.
5. لا أسرار في المستودع. أي مفتاح يظهر في محادثة يُعدّ مسرّبًا ويُستبدل.
6. لا تدّعِ نجاح بناء iOS على Windows/Linux — المسار `.github/workflows/ios.yml`.
7. التوثيق بالعربية في `docs/`؛ أسماء الكود بالإنجليزية.

## الوكلاء المتخصصون

### داخل Claude Code (`.claude/agents/`)
استخدمهم عبر `@اسم-الوكيل` أو بترك Claude يفوّض تلقائيًا:

| الوكيل | التخصص |
| --- | --- |
| `architect` | تخطيط الميزة، ADR، تقسيم المهام |
| `api-backend` | نقاط النهاية، الخدمات، الصلاحيات، انتقالات الحالة |
| `database-rls` | Prisma schema، هجرات SQL، سياسات RLS، قيود |
| `android-mobile` | Capacitor، Gradle، APK/AAB، أيقونات |
| `quality-qa` | حالات قبول، اختبارات Vitest، تقارير عيوب |
| `security-review` | عزل المستأجرين، مصادقة، أسرار، تبعيات |

### في GitHub Copilot Chat (`.github/chatmodes/`)
نفس التخصصات الثمانية + `ios` و`reviewer`، مع قوالب `.github/prompts/`.

### مشاركة السياق بين الأدوات
`AGENTS.md` (الجذر) هو نقطة الالتقاء لكل الأدوات: Claude Code، Codex CLI، Gemini CLI، Cursor.
أي قاعدة جديدة تُضاف في `.github/copilot-instructions.md` ثم تُشار إليها هنا، لا تُكرَّر.

## ما يجب أن يظهر في نهاية أي مهمة
- الملفات التي تغيّرت ولماذا.
- الأوامر التي شُغّلت ونتيجتها الحقيقية (نجاح/فشل).
- ما لم يُتحقَّق منه وسببه (قاعدة بيانات، JDK، جهاز حقيقي…).
