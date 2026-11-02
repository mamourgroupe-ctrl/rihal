---
applyTo: "apps/api/test/**/*.test.ts, packages/database/test/**/*.test.ts"
---

# قواعد الاختبارات (Vitest)

- **التسمية:** `<domain>.integration.test.ts` لما يحتاج PostgreSQL، و`<unit>.test.ts` للوحدات النقية.
- **التخطي الآمن:** اختبارات القاعدة تتحقق من `process.env.TEST_DATABASE_URL && TEST_ADMIN_DATABASE_URL` وتُسجّل `describe.skip` برسالة واضحة عند غيابها. لا تُفشل السويت بلا قاعدة.
- **البيانات:** عشوائية (`randomUUID`) وبادئة واضحة (`phase4-`, `rls-`)، وتُنظَّف في `afterEach/afterAll` بالأرشفة.
- **العزل:** كل اختبار تكامل يبدأ بـ `set_config('app.current_tenant_id', …, true)` داخل معاملة، ويتحقق من رفض الوصول عبر المستأجرين.
- **السلوك:** اختبر الحالة النهائية وقيم الحدود (سعة المجموعة، قائد واحد، مبلغ الفاتورة، تاريخ استحقاق ماضٍ) لا التفاصيل الداخلية.
- **الأوامر:** `corepack pnpm --filter @rihal/api test` و`corepack pnpm --filter @rihal/database test`، ومع قاعدة: `TEST_DATABASE_URL=… TEST_ADMIN_DATABASE_URL=… pnpm exec vitest run`.
- **ممنوع:** اختبارات تعتمد على الشبكة أو الساعة الحقيقية دون إمكانية ضبط الوقت.
