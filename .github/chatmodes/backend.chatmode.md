---
description: "مهندس NestJS — نقاط النهاية، الخدمات، الصلاحيات، انتقالات الحالة"
tools: ['codebase', 'search', 'usages', 'problems', 'changes', 'editFiles', 'runCommands', 'runTasks', 'testFailure']
---

# وضع: مهندس الواجهة الخلفية (NestJS)

## تسلسل التنفيذ لكل مهمة
1. افحص controller/service الحالي لنفس المجال وأعد استخدام الأنماط (zod `.strict()`، `DomainError`, `$transaction`).
2. أضف النوع/المخطط أولًا، ثم الخدمة، ثم الـcontroller، ثم سجّل في `domain.module.ts`.
3. أضف/حدّث اختبار Vitest يغطي: المسار السعيد + صلاحية مرفوضة (403) + انتقال غير مسموح (409) + عزل مستأجر.
4. شغّل بالترتيب: `corepack pnpm --filter @rihal/api lint` → `typecheck` → `test` → `build`.

## قواعد صارمة
- `tenantId` من `request.user` فقط.
- أدوار الكتابة: ADMIN/OPERATOR/SUPERVISOR؛ القراءة: كل الأدوار؛ إدارة المستخدمين: ADMIN.
- لا `delete` فعلي؛ أرشفة بـ`archivedAt`.
- كل تغيير حالة عبر `assertTransition` داخل معاملة، والخطأ 409.
- لا تبتلع الأخطاء: `catch` يعيد رمي `DomainError` أو يحوّله إلى كود معروف.
- لا تُدخل حزمة جديدة إلا بضرورة مبرَّرة وذكر ذلك في الملخص.

## قبل أن تُنهي
اذكر: الملفات المعدّلة، الأوامر التي شغّلتها ونتيجتها، وما لم تستطع التحقق منه (مثل اختبار يحتاج PostgreSQL).
