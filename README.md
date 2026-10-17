<div align="center">

# 🕌 Rihal | رحال

### منصة SaaS متعددة المستأجرين لإدارة عمليات وكالات الحج والعمرة

**Multi-tenant SaaS platform for Hajj and Umrah agency operations**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/tests-11%20passing-brightgreen)](#-الاختبارات)

</div>

---

## 🎯 المشكلة التي يحلها

وكالات الحج والعمرة تدير مواسمها عبر واتساب وجداول Excel. هذا يسبب أخطاء وفقدان معلومات وإهدار ساعات.

**Rihal** يبني الطبقة التشغيلية المفقودة: إدارة المعتمرين، المجموعات، الوثائق، والفوترة.

---

## 🏗️ المعمارية التقنية

| الطبقة | التقنية |
| :--- | :--- |
| Frontend (قادم) | Next.js 15 + React 19 + TypeScript |
| Backend | NestJS 10 + TypeScript |
| Database | PostgreSQL 16 (Neon / Docker) + RLS |
| ORM | Prisma 6 |
| Cache/Queue | Redis 7 (Upstash) + BullMQ |
| Auth | Auth.js v5 |
| Monorepo | Turborepo + pnpm |

```
rihal/
├── apps/
│   └── api/                    # NestJS API + لوحة العمليات
│       ├── src/
│       │   ├── pilgrims/       # CRUD المعتمرين + بحث/تصفية/ترقيم
│       │   ├── groups/         # المجموعات والأعضاء
│       │   ├── dashboard/      # مؤشرات الأداء
│       │   ├── domain/         # Prisma + in-memory providers
│       │   ├── common/         # TenantGuard + @Tenant()
│       │   └── landing.page.ts # لوحة RTL تعمل على /
│       └── test/               # 11 اختبار e2e (node:test)
├── packages/
│   └── database/
│       └── prisma/
│           ├── schema.prisma   # 8 نماذج
│           ├── seed.ts         # بيانات تجريبية واقعية
│           └── sql/rls.sql     # سياسات RLS + دور التطبيق
└── docker-compose.yml          # PostgreSQL 16 + Redis 7 محلياً
```

---

## 🚀 البدء السريع

```bash
git clone https://github.com/mamourgroupe-ctrl/rihal.git
cd rihal
pnpm install
cp .env.example .env

# 1) قاعدة البيانات محلياً (اختياري — بدونهما يعمل API بذاكرة تجريبية)
docker compose up -d

# 2) Prisma
pnpm db:generate
pnpm --filter @rihal/database db:push
pnpm --filter @rihal/database db:rls      # سياسات العزل (RLS)
pnpm db:seed                              # بيانات تجريبية

# 3) التشغيل
pnpm dev
```

- لوحة العمليات: <http://localhost:4000>
- الـ API: <http://localhost:4000/api>
- فحص الحالة: <http://localhost:4000/api/health>

### أوضاع التشغيل

| `PERSISTENCE` | السلوك |
| :--- | :--- |
| `auto` (الافتراضي) | PostgreSQL إذا كان متاحاً، وإلا مخزن ذاكرة تجريبي |
| `postgres` | يتطلب PostgreSQL ويفشل بسرعة إن لم يتصل |
| `memory` | مخزن ذاكرة تجريبي دائماً |

> عند العمل بمخزن الذاكرة تُعرض شارة «بيانات تجريبية» في اللوحة، والبيانات تُفقد عند إعادة التشغيل.

---

## 📡 واجهة الـ API

جميع المسارات تحت `/api`، وكل طلب يُعزل حسب الوكالة عبر ترويسة `x-tenant-id`
(القيمة الافتراضية `tenant_demo`).

| Method | Endpoint | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/health` | حالة الخدمة + backend التخزين |
| `GET` | `/api/dashboard` | مؤشرات الوكالة (جاهزون، مقاعد، جوازات) |
| `GET` | `/api/pilgrims?page=1&limit=20&search=&status=` | قائمة المعتمرين (مرقّمة + بحث + تصفية) |
| `POST` | `/api/pilgrims` | إضافة معتمر |
| `GET` | `/api/pilgrims/:id` | تفاصيل معتمر |
| `PATCH` | `/api/pilgrims/:id` | تعديل معتمر |
| `DELETE` | `/api/pilgrims/:id` | حذف معتمر |
| `GET` | `/api/pilgrims/stats` | إحصاءات الحالات |
| `GET` | `/api/groups?status=` | قائمة المجموعات |
| `POST` | `/api/groups` | إنشاء مجموعة |
| `GET` | `/api/groups/:id` | تفاصيل مجموعة |
| `PATCH` | `/api/groups/:id` | تعديل مجموعة |
| `DELETE` | `/api/groups/:id` | حذف مجموعة |
| `POST` | `/api/groups/:id/members` | إضافة عضو (`pilgrimId`, `isLeader`) |
| `DELETE` | `/api/groups/:id/members/:pilgrimId` | إزالة عضو |

### مثال

```bash
curl -X POST http://localhost:4000/api/pilgrims \
  -H 'content-type: application/json' \
  -H 'x-tenant-id: tenant_demo' \
  -d '{
    "fullNameAr": "سعد بن ناصر",
    "fullNameEn": "Saad Bin Nasser",
    "passportNumber": "X9998887",
    "passportExpiry": "2029-06-01",
    "nationality": "SAU",
    "gender": "MALE",
    "phone": "+966500000000"
  }'
```

الاستجابات:

- `400` — خطأ تحقق مع رسائل عربية مفصّلة.
- `401` — معرّف وكالة غير صالح.
- `404` — السجل غير موجود داخل هذه الوكالة.
- `409` — رقم جواز مكرر داخل الوكالة، أو مجموعة مكتملة، أو عضو مكرر.
- `204` — نجاح الحذف.

---

## 🔐 التعددية والعزل (Tenancy)

ثلاث طبقات حماية:

1. **في الكود** — كل استعلام يستقبل `tenantId` صراحةً ولا يمكن قراءة سجل وكالة أخرى.
2. **عند البوابة** — `TenantGuard` يتحقق من صيغة `x-tenant-id` ويرفض غير الصالح (401).
3. **في قاعدة البيانات** — سياسات RLS في `packages/database/prisma/sql/rls.sql` تعتمد
   `app.current_tenant` وتُعيد صفر صفوف إذا لم يُضبط المتغير (fail-closed).

```sql
BEGIN;
SELECT set_current_tenant('tenant_demo');
SELECT * FROM pilgrims;   -- صفوف الوكالة فقط
COMMIT;
```

> في الإنتاج: اتصل بدور `rihal_app` (لا يملك الجداول) وليس بدور الترحيل، ثم استبدل
> ترويسة `x-tenant-id` بجلسة Auth.js.

---

## 🗄️ نموذج البيانات (Prisma — 8 نماذج)

| المجال | النماذج |
| :--- | :--- |
| التعددية | `Tenant` (FREE/BASIC/PRO/ENTERPRISE) |
| المستخدمون | `User` (ADMIN/OPERATOR/SUPERVISOR/VIEWER) |
| المعتمرون | `Pilgrim` (DRAFT → REGISTERED → DOCUMENTS_UPLOADED → READY_FOR_BOOKING → BOOKED → PERMIT_ISSUED → COMPLETED) |
| المجموعات | `Group` + `GroupMember` (مع قائد المجموعة) |
| الوثائق | `Document` (جواز/تأشيرة/صورة/تطعيم/تأمين + OCR) |
| الفوترة | `Invoice` (حقول ZATCA QR/hash) |
| الإشعارات | `Notification` (WhatsApp/Email/SMS/In-App) |

---

## 🧪 الاختبارات

```bash
pnpm --filter @rihal/api test
```

11 اختباراً تكاملياً تغطي: الحالة والصحة، الصفحة الرئيسية، الترقيم والبحث والتصفية،
التحقق من الصحة برسائل عربية، دورة CRUD كاملة، منع الجواز المكرر، عزل المستأجرين،
إدارة المجموعات والأعضاء، ومؤشرات اللوحة.

---

## 🗺️ خارطة الطريق

- [x] Monorepo + Turborepo
- [x] Prisma Schema (8 نماذج)
- [x] RLS Policies + دور التطبيق
- [x] NestJS API — معتمرون / مجموعات / لوحة مؤشرات
- [x] لوحة عمليات عربية (RTL) بمعاينة حية
- [x] اختبارات e2e + CI
- [x] Docker Compose (PostgreSQL + Redis)
- [ ] Auth.js v5 + الأدوار
- [ ] رفع الوثائق + OCR
- [ ] الفوترة ومتوافق ZATCA
- [ ] إشعارات WhatsApp/SMS عبر BullMQ
- [ ] Next.js Frontend

---

## 📄 الرخصة

Proprietary © 2026 Mamourgroupe
