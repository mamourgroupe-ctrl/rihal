---
applyTo: "apps/api/src/**/*.ts"
---

# قواعد طبقة API (NestJS 11)

- **البنية:** controller رقيق (تحقق + استدعاء خدمة) + service يملك المنطق + `PrismaService` للوصول للبيانات. لا استعلامات داخل controller.
- **التحقق:** مخططات zod مع `.strict()` في `*.dto.ts`/`*.schemas.ts`؛ الحقول غير المعروفة تُرفض. استخدم `ZodValidationPipe` القائم.
- **السياق:** خُذ `tenantId` و`userId` و`role` من `request.user` الذي يضعه `JwtAuthGuard`؛ لا تقرأها من `params/body/query`.
- **الأخطاء:** ارمِ `DomainError` بأكواد معروفة (`INVALID_STATE_TRANSITION`, `GROUP_CAPACITY_EXCEEDED`, `NOT_FOUND`…) ودع `DomainExceptionFilter` يحوّلها إلى HTTP. لا تُرجع `{ error: ... }` يدويًا.
- **الأنواع:** Prisma يُنتج أنواعًا مُستنتَجة؛ صرّح دائمًا بنوع الإرجاع (`Promise<{ items: X[]; total: number }>`) لتفادي TS2742. لا تخلط `include` إضافي مع نوع مركّب موجود.
- **الحالة:** الانتقالات عبر `assertTransition` من `status-transitions.ts` داخل معاملة `$transaction`.
- **الأرشفة:** الحذف = `archivedAt` (soft delete). لا `delete` فعلي في مسارات المجال.
- **الجلسات:** أي تغيير في دور/تفعيل مستخدم يجب أن يُبطل جلساته (`revokeSessionsForUser`).
- **التوثيق:** كل نقطة نهاية جديدة تُضاف إلى جدول المسارات في `docs/dev-environment.md` أو `docs/progress.md` عند الاقتضاء.
- **الأداء:** استخدم `select` صريحًا بدل جلب كامل للسجل، و`take/skip` مع `orderBy` ثابت في القوائم.
