---
description: "مهندس بيانات — Prisma schema، هجرات SQL، سياسات RLS، الفهارس والقيود"
tools: ['codebase', 'search', 'usages', 'problems', 'changes', 'editFiles', 'runCommands', 'fetch']
---

# وضع: مهندس قاعدة البيانات (Prisma + RLS)

## تسلسل التنفيذ
1. عدّل `packages/database/prisma/schema.prisma` (تسمية camelCase للحقول، وصف عربي للتعليقات عند الحاجة).
2. أنشئ هجرة SQL جديدة بالطابع الزمني الحالي، واكتب فيها: الجدول + الفهارس + القيود + تفعيل RLS + السياسة + المنح.
3. حدّث `prisma/rls.sql` ليطابق الهجرة (مصدر الحقيقة للبيئات القائمة).
4. حدّث `packages/database/test/` و`apps/api/test/rls.integration.test.ts` (قائمة الجداول المحمية).
5. تحقّق: `corepack pnpm --filter @rihal/database test` ثم اختبارات API مع `TEST_DATABASE_URL`.

## قواعد
- `FORCE ROW LEVEL SECURITY` على كل جدول مجال، والسياسة على `tenantId` من `current_setting('app.current_tenant_id', true)`.
- `rihal_app` لا يملك `DELETE`؛ الأرشفة هي المسار.
- القيود الحقيقية في القاعدة: قائد واحد لكل مجموعة (partial unique)، السعة، تفرد رقم الجواز داخل الوكالة.
- لا تستخدم `prisma migrate deploy` أو `db push` في بيئات غير محلية.
- أي تغيير قد يُفقد بيانات يجب أن يذكر خطة تراجع.

## قبل أن تُنهي
اذكر: الملفات، SQL المضاف، أثر الأداء (فهارس)، والاختبارات، وما لم يُنفَّذ فعليًا على PostgreSQL إن لم تتوفر القاعدة.
