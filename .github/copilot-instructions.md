# تعليمات المستودع لوكلاء الذكاء الاصطناعي (رحّال)

> هذا الملف يقرأه GitHub Copilot تلقائيًا في كل محادثة. الملفات المتخصصة في
> `.github/instructions/` تُطبَّق حسب المسار، وأوضاع العمل في `.github/chatmodes/`،
> والقوالب الجاهزة في `.github/prompts/`. الدليل البشري: `docs/dev-environment.md`.

## ما هو المشروع
منصة SaaS متعددة المستأجرين لإدارة عمليات وكالات الحج والعمرة (Hajj/Umrah).
كل وكالة = مستأجر مستقل (`tenantId`)، والعزل مفروض في قاعدة البيانات بـ RLS
وفي طبقة الخدمة في نفس الوقت.

## الخريطة
| المسار | المحتوى |
| --- | --- |
| `apps/api` | NestJS 11: `src/auth`, `src/domain`, `src/dashboard`, `src/database`, `test/`، وواجهة العمليات الثابتة في `public/` |
| `apps/mobile` | غلاف Capacitor للأندرويد/iOS + `tools/prepare-web.mjs` |
| `packages/database` | Prisma 6 schema + migrations + seed + أدوار PostgreSQL |
| `docs/` | قرارات، تقدم المراحل، دليل بيئة التطوير، نصائح أندرويد |
| `tooling/` | سكربتات بيئة التطوير (`doctor.mjs`, `setup/*`, `serve-console.mjs`) |

## الأوامر المعتمدة (pnpm فقط، لا npm/yarn)
```bash
corepack pnpm install
corepack pnpm db:generate && corepack pnpm db:migrate && corepack pnpm db:seed
corepack pnpm lint && corepack pnpm typecheck && corepack pnpm build && corepack pnpm test
corepack pnpm android:prepare && corepack pnpm android:sync && corepack pnpm android:apk
node tooling/doctor.mjs
```

## قواعد لا تُخالَف
1. **العزل:** لا استعلام بدون `tenantId` من السياق الموثوق. لا تقبل `tenantId` من جسم الطلب أو معاملات الاستعلام.
2. **RLS:** كل جدول مجال يحمل `tenantId` وسياسة `tenant_isolation_*` و`FORCE ROW LEVEL SECURITY`. أي migration يمسّ جدول مجال يجب أن يُحدِّث السياسات في نفس الملف.
3. **Prisma بلا محرك:** `engineType = "client"` + `@prisma/adapter-pg`. لا تستخدم `prisma migrate deploy` محليًا ولا تُضِف `binaryTargets`.
4. **الصلاحيات:** الكتابة لـ ADMIN/OPERATOR/SUPERVISOR فقط، و`VIEWER` للقراءة، وإدارة المستخدمين لـ ADMIN فقط. استخدم الـ `RolesGuard` الموجود بدل شروط مبعثرة.
5. **انتقالات الحالة:** استخدم `status-transitions.ts` و`DomainError`؛ الانتقال غير المسموح = 409، وليس 500.
6. **الأسرار:** لا مفاتيح، لا كلمات مرور، لا رموز FCM/Apple في المستودع. `.env` غير مُتعقَّب، والسكربتات تقرأ من البيئة.
7. **اللغة:** الشرح والتوثيق والتعليقات الموجَّهة للفريق بالعربية؛ أسماء الكود والمعرّفات بالإنجليزية.
8. **الاختبارات:** أي مسار جديد يحتاج اختبارًا في `apps/api/test/*.test.ts`، والاختبارات التي تحتاج PostgreSQL تُتخطّى تلقائيًا عند غياب `TEST_DATABASE_URL`.
9. **الواجهة:** `apps/api/public` بلا أدوات بناء (vanilla JS + CSS). لا تُدخل React/Next أو bundler هناك.
10. **iOS:** لا تدّعِ بناء iOS محليًا على Windows؛ استخدم سير `.github/workflows/ios.yml` على macOS.

## أسلوب العمل المقبول
- خطوة واحدة متماسكة لكل تغيير، مع رسالة commit من نوع `feat|fix|docs|chore|test|refactor(scope): …`.
- شغّل `lint` و`typecheck` و`test` و`build` قبل أي دفع.
- لا تُنشئ ملفات توثيق مبعثرة؛ التحديث يذهب إلى `docs/` الموجود.
- لا تعدّل `.github/workflows/ci.yml` لتجاوز فحوص؛ أصلح الكود بدلًا من ذلك.
