# RLS — عزل المستأجرين على مستوى قاعدة البيانات

الملف `rls.sql` يفعّل سياسات Row Level Security على كل الجداول التي تحمل `tenant_id`.

## التطبيق

```bash
# 1) بعد db:push أو db:migrate
pnpm --filter @rihal/database db:rls

# أو مباشرة
psql "$DIRECT_URL" -f packages/database/prisma/sql/rls.sql
```

## كيف تستخدمه التطبيقات

كل عملية يجب أن تحدّد الوكالة داخل نفس المعاملة:

```sql
BEGIN;
SELECT set_current_tenant('tenant_demo');
SELECT * FROM pilgrims;   -- يعيد معتمري الوكالة فقط
COMMIT;
```

مع Prisma:

```ts
await prisma.$transaction(async (tx) => {
  await tx.$executeRaw`SELECT set_current_tenant(${tenantId})`;
  return tx.pilgrim.findMany();
});
```

> مهم: اتصل بقاعدة البيانات بدور لا يملك الجداول (`rihal_app`)، لأن مالك الجدول
> يتجاوز RLS افتراضياً ما لم تُفعّل `FORCE ROW LEVEL SECURITY`.

## سلوك افتراضي آمن

الدالة `app_current_tenant()` تقرأ `current_setting('app.current_tenant', true)`
وتعيد `NULL` إذا لم تُضبط، لذا تُرجع الاستعلامات صفر صفوف بدل تسريب بيانات وكالة أخرى.

## ملاحظات

- `group_members` لا يحمل `tenant_id`؛ تُشتق الملكية عبر `groups.tenant_id`.
- سياسة `tenants` تسمح لكل وكالة برؤية سجلها فقط.
- الجداول المستقبلية: أضف `ENABLE ROW LEVEL SECURITY` + سياسة `tenant_isolation` عند إنشائها.
