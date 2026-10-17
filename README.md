<div align="center">

# 🕌 Rihal | رحال

### منصة SaaS متعددة المستأجرين لإدارة عمليات وكالات الحج والعمرة

**Multi-tenant SaaS platform for Hajj and Umrah agency operations**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/tests-17%20passing-brightgreen)](#-الاختبارات)

</div>

---

## 🎯 المشكلة التي يحلها

وكالات الحج والعمرة تدير مواسمها عبر واتساب وجداول Excel. هذا يسبب أخطاء وفقدان معلومات وإهدار ساعات.

**Rihal** يبني الطبقة التشغيلية المفقودة: إدارة المعتمرين، المجموعات، الوثائق، والفوترة — مع عزل صارم لبيانات كل وكالة.

---

## 🏗️ المعمارية التقنية

| الطبقة | التقنية |
| :--- | :--- |
| Frontend (قادم) | Next.js 15 + React 19 + TypeScript |
| Backend | NestJS 10 + TypeScript |
| Auth | JWT (HS256) + RBAC — متوافق مع Auth.js v5 لاحقاً |
| Database | PostgreSQL 16 (Neon / Docker) + RLS |
| ORM | Prisma 6 |
| Cache/Queue | Redis 7 (Upstash) + BullMQ |
| Monorepo | Turborepo + pnpm |

```
rihal/
├── apps/
│   └── api/                    # NestJS API + لوحة العمليات
│       ├── src/
│       │   ├── auth/           # JWT، تسجيل/دخول، أدوار، حراس عالميون
│       │   ├── pilgrims/       # CRUD المعتمرين + بحث/تصفية/ترقيم
│       │   ├── groups/         # المجموعات والأعضاء
│       │   ├── dashboard/      # مؤشرات الأداء
│       │   ├── domain/         # Prisma + in-memory providers
│       │   ├── common/         # @Tenant() من الهوية الموثقة
│       │   └── landing.page.ts # لوحة RTL + شاشة دخول
│       └── test/               # 17 اختبار e2e (node:test)
├── packages/
│   └── database/
│       └── prisma/
│           ├── schema.prisma   # 8 نماذج
│           ├── seed.ts         # وكالة تجريبية + 12 معتمراً + 4 مستخدمين
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

# 1) قاعدة البيانات محلياً (بدونها يعمل API بذاكرة تجريبية)
docker compose up -d

# 2) Prisma
pnpm db:generate
pnpm --filter @rihal/database db:push
pnpm --filter @rihal/database db:rls      # سياسات العزل (RLS)
pnpm db:seed                              # بيانات تجريبية

# 3) التشغيل
pnpm dev
```

- لوحة العمليات + شاشة الدخول: <http://localhost:4000>
- الـ API: <http://localhost:4000/api>
- فحص الحالة: <http://localhost:4000/api/health>

### حسابات تجريبية

| الدور | البريد | الصلاحيات |
| :--- | :--- | :--- |
| `ADMIN` | `admin@rihal.demo` | كل شيء، بما في ذلك الحذف وإدارة المستخدمين |
| `OPERATOR` | `operator@rihal.demo` | قراءة وإضافة وتعديل المعتمرين والمجموعات |
| `SUPERVISOR` | `supervisor@rihal.demo` | إضافة/تعديل + إدارة أعضاء المجموعات (بدون حذف) |
| `VIEWER` | `viewer@rihal.demo` | قراءة فقط |

كلمة المرور للجميع: `Rihal@2026` — **بدّلها قبل أي بيئة حقيقية**.

### أوضاع التشغيل

| `PERSISTENCE` | السلوك |
| :--- | :--- |
| `auto` (الافتراضي) | PostgreSQL إذا كان متاحاً، وإلا مخزن ذاكرة تجريبي |
| `postgres` | يتطلب PostgreSQL ويفشل بسرعة إن لم يتصل |
| `memory` | مخزن ذاكرة تجريبي دائماً |

> عند العمل بمخزن الذاكرة تُعرض شارة «بيانات تجريبية» في اللوحة، والبيانات تُفقد عند إعادة التشغيل.

---

## 🔐 المصادقة والصلاحيات

- **تسجيل الدخول** بالبريد وكلمة المرور، وتُصدر الجلسة رمز JWT موقّعاً (HS256) صالحاً 12 ساعة افتراضياً.
- **إعادة التحقق من الهوية** في كل طلب: تعطيل المستخدم أو إيقاف الوكالة يُبطل الوصول فوراً حتى لو كان الرمز صالحاً.
- **الأدوار** تُطبَّق عبر حراس عالميين (`JwtAuthGuard` + `RolesGuard`).
- **عزل الوكالة** يُشتق من رمز JWT الموقّع — لا يمكن للعميل اختيار وكالة أخرى عبر ترويسة.
- **RLS** كطبقة دفاع أخيرة على مستوى PostgreSQL (انظر أدناه).

### الجلسة

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@rihal.demo","password":"Rihal@2026"}'
```

```json
{
  "accessToken": "eyJhbGciOi...",
  "tokenType": "Bearer",
  "expiresIn": "12h",
  "user": { "name": "مدير الوكالة", "role": "ADMIN", "email": "admin@rihal.demo" },
  "tenant": { "slug": "demo", "plan": "PRO", "status": "ACTIVE" }
}
```

ثم أرسل `Authorization: Bearer <token>` مع كل طلب.

---

## 📡 واجهة الـ API

كل المسارات تحت `/api`. المسارات العامة: `/api`, `/api/health`, `/api/auth/login`, `/api/auth/register`؛ وما عداها يتطلب Bearer token.

| Method | Endpoint | الوصف | الأدوار |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | حالة الخدمة + backend التخزين | عام |
| `POST` | `/api/auth/login` | دخول وإصدار رمز | عام |
| `POST` | `/api/auth/register` | إنشاء وكالة + مديرها الأول | عام |
| `GET` | `/api/auth/me` | المستخدم والوكالة الحالية | كل الأدوار |
| `GET` | `/api/auth/users` | أعضاء الوكالة | `ADMIN` |
| `GET` | `/api/dashboard` | مؤشرات الوكالة | كل الأدوار |
| `GET` | `/api/pilgrims?page=1&limit=20&search=&status=` | قائمة المعتمرين | كل الأدوار |
| `POST` | `/api/pilgrims` | إضافة معتمر | `ADMIN` `OPERATOR` `SUPERVISOR` |
| `GET` | `/api/pilgrims/:id` | تفاصيل معتمر | كل الأدوار |
| `PATCH` | `/api/pilgrims/:id` | تعديل معتمر | `ADMIN` `OPERATOR` `SUPERVISOR` |
| `DELETE` | `/api/pilgrims/:id` | حذف معتمر | `ADMIN` |
| `GET` | `/api/pilgrims/stats` | إحصاءات الحالات | كل الأدوار |
| `GET` | `/api/groups?status=` | قائمة المجموعات | كل الأدوار |
| `POST` | `/api/groups` | إنشاء مجموعة | `ADMIN` `OPERATOR` `SUPERVISOR` |
| `GET` | `/api/groups/:id` | تفاصيل مجموعة | كل الأدوار |
| `PATCH` | `/api/groups/:id` | تعديل مجموعة | `ADMIN` `OPERATOR` `SUPERVISOR` |
| `DELETE` | `/api/groups/:id` | حذف مجموعة | `ADMIN` |
| `POST` | `/api/groups/:id/members` | إضافة عضو (`pilgrimId`, `isLeader`) | `ADMIN` `OPERATOR` `SUPERVISOR` |
| `DELETE` | `/api/groups/:id/members/:pilgrimId` | إزالة عضو | `ADMIN` `SUPERVISOR` |

### مثال مع مصادقة

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@rihal.demo","password":"Rihal@2026"}' | jq -r .accessToken)

curl -X POST http://localhost:4000/api/pilgrims \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
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

الاستجابات: `400` تحقق برسائل عربية · `401` جلسة مفقودة/منتهية · `403` صلاحية غير كافية ·
`404` سجل غير موجود داخل الوكالة · `409` جواز مكرر/مجموعة مكتملة/عضو مكرر · `204` حذف ناجح.

---

## 🔐 العزل على مستوى قاعدة البيانات (RLS)

ثلاث طبقات: **(1)** كل استعلام يستقبل `tenantId` من الهوية الموثقة، **(2)** الحراس يرفضون
الطلبات غير الموثقة أو غير المصرح بها، **(3)** RLS في PostgreSQL تمنع أي تسريب حتى لو أخطأ الاستعلام.

```sql
BEGIN;
SELECT set_current_tenant('tenant_demo');
SELECT * FROM pilgrims;   -- صفوف الوكالة فقط
COMMIT;
```

> في الإنتاج: اتصل بدور `rihal_app` (لا يملك الجداول) وليس بدور الترحيل.

---

## 🗄️ نموذج البيانات (Prisma — 8 نماذج)

| المجال | النماذج |
| :--- | :--- |
| التعددية | `Tenant` (FREE/BASIC/PRO/ENTERPRISE) |
| المستخدمون | `User` (ADMIN/OPERATOR/SUPERVISOR/VIEWER + `passwordHash`) |
| المعتمرون | `Pilgrim` (DRAFT → … → COMPLETED) |
| المجموعات | `Group` + `GroupMember` (قائد المجموعة) |
| الوثائق | `Document` (جواز/تأشيرة/صورة/تطعيم/تأمين + OCR) |
| الفوترة | `Invoice` (حقول ZATCA QR/hash) |
| الإشعارات | `Notification` (WhatsApp/Email/SMS/In-App) |

---

## 🧪 الاختبارات

```bash
pnpm --filter @rihal/api test
```

**17 اختباراً تكاملياً** تغطي: الصحة والصفحة الرئيسية، رفض الطلبات غير الموثقة، الدخول
(نجاح/فشل)، `/auth/me`، إدارة المستخدمين، تسجيل وكالة جديدة وعزلها، منع انتحال الوكالة
بترويسة، CRUD المعتمرين، البحث والتصفية والتحقق، الجواز المكرر، صلاحيات الأدوار
(VIEWER للقراءة فقط وSUPERVISOR بلا حذف)، المجموعات والأعضاء، ومؤشرات اللوحة.

---

## 🗺️ خارطة الطريق

- [x] Monorepo + Turborepo
- [x] Prisma Schema (8 نماذج)
- [x] RLS Policies + دور التطبيق
- [x] NestJS API — معتمرون / مجموعات / لوحة مؤشرات
- [x] مصادقة JWT + أدوار + تسجيل وكالة جديدة
- [x] لوحة عمليات عربية (RTL) + شاشة دخول وواجهة حسب الدور
- [x] اختبارات e2e + CI + Docker Compose
- [ ] Auth.js v5 في واجهة Next.js (استخدام نفس الـ API)
- [ ] رفع الوثائق + OCR
- [ ] الفوترة ومتوافق ZATCA
- [ ] إشعارات WhatsApp/SMS عبر BullMQ
- [ ] Next.js Frontend

---

## 📄 الرخصة

Proprietary © 2026 Mamourgroupe
