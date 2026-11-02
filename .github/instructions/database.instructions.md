---
applyTo: "packages/database/**"
---

# قواعد قاعدة البيانات و RLS

- **الهجرات:** ملف SQL جديد في `prisma/migrations/<timestamp>_<name>/migration.sql`؛ لا تعدّل هجرة مطبَّقة. التوقيت بصيغة `YYYYMMDDHHMMSS`.
- **الأدوار:** `rihal_migrator` يملك المخطط (هجرات/بذور)، و`rihal_app` دور تشغيل بلا `SUPERUSER`/`BYPASSRLS`/`CREATEDB`/`CREATEROLE` وبلا `DELETE`. أي منح جديد يُضاف إلى `prisma/rls.sql` **و** إلى الهجرة معًا.
- **RLS إلزامي:** لكل جدول جديد فيه `tenantId`:
  ```sql
  ALTER TABLE "x" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "x" FORCE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation_x ON "x"
    USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));
  ```
  وحدّث قائمة الجداول في `test/rls.integration.test.ts`.
- **القيود:** تفضيل قيود قاعدة البيانات (partial unique index للقائد الواحد في المجموعة، check للسعة) على التحقق البرمجي وحده.
- **البذور:** تُشغَّل بدور `rihal_migrator`؛ لا تُدرج بيانات حقيقية. كلمات مرور البذور تجريبية وواضحة.
- **Prisma:** لا تُشغّل `prisma migrate` هنا داخل السَّاندبوكس؛ الملفات تُراجَع ثم تُطبَّق في CI. `db:generate` يحتاج محركًا/VASM حسب البيئة.
- **التحقق:** عدّل/أضف اختبارًا في `packages/database/test/` لكل قيد جديد، وشغّل `corepack pnpm --filter @rihal/database test`.
