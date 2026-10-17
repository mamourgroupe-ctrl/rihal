<div align="center">

# 🕌 Rihal | رحال

### منصة SaaS متعددة المستأجرين لإدارة عمليات وكالات الحج والعمرة

**Multi-tenant SaaS platform for Hajj and Umrah agency operations**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/tests-38%20passing-brightgreen)](#-الاختبارات)

</div>

---

## 🎯 المشكلة التي يحلها

وكالات الحج والعمرة تدير مواسمها عبر واتساب وجداول Excel. هذا يسبب أخطاء وفقدان معلومات وإهدار ساعات.

**Rihal** يبني الطبقة التشغيلية المفقودة: إدارة المعتمرين، المجموعات، الوثائق، والفوترة — مع عزل صارم لبيانات كل وكالة.

---

## 🏗️ المعمارية التقنية

| الطبقة | التقنية |
| :--- | :--- |
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript — RTL |
| Backend | NestJS 10 + TypeScript |
| Auth | JWT (HS256) + RBAC — متوافق مع Auth.js v5 لاحقاً |
| Database | PostgreSQL 16 (Neon / Docker) + RLS |
| ORM | Prisma 6 |
| Cache/Queue | Redis 7 (Upstash) + BullMQ |
| Monorepo | Turborepo + pnpm |

```
rihal/
├── apps/
│   ├── api/                    # NestJS API + لوحة HTML احتياطية
│   │   ├── src/
│   │   │   ├── auth/           # JWT، تسجيل/دخول، أدوار، حراس عالميون
│   │   │   ├── pilgrims/       # CRUD المعتمرين + بحث/تصفية/ترقيم
│   │   │   ├── groups/         # المجموعات والأعضاء
│   │   │   ├── documents/      # رفع الوثائق + تحقق MRZ + تخزين محمي
│   │   │   ├── invoices/       # فوترة + ZATCA QR/TLV + UBL XML + hash chain
│   │   │   ├── tenant/         # هوية البائع (الرقم الضريبي/السجل)
│   │   │   ├── dashboard/      # مؤشرات الأداء
│   │   │   ├── domain/         # Prisma + in-memory providers
│   │   │   ├── common/         # @Tenant() من الهوية الموثقة
│   │   │   └── landing.page.ts # لوحة RTL مفردة (احتياطية)
│   │   └── test/               # 38 اختبار e2e (node:test)
│   └── web/                    # Next.js 15 — الواجهة الرئيسية
│       ├── app/                # /login + (dashboard): overview/pilgrims/groups/invoices/settings
│       ├── components/         # AppShell (RTL) + مجموعة مكوّنات UI
│       └── lib/                # عميل /api، الجلسة والصلاحيات، الأنواع، التنسيق
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

# 3) التشغيل — API والواجهة معاً
pnpm dev

# أو كل خدمة على حدة
pnpm dev:api          # NestJS على :4000
pnpm dev:web          # Next.js على :3000
```

- **واجهة الويب (Next.js):** <http://localhost:3000>
- **اللوحة المفردة (HTML):** <http://localhost:4000>
- الـ API: <http://localhost:4000/api>
- فحص الحالة: <http://localhost:4000/api/health>

> الواجهة تستهلك نفس الـ API عبر وكيل same-origin: المتصفح يطلب `/api/*` من أصل الواجهة،
> ويعيد Next توجيهها إلى `API_URL` (افتراضياً `http://127.0.0.1:4000`).

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

## 🖥️ واجهة الويب (Next.js 15)

الواجهة الرئيسية في `apps/web`: Next.js App Router + React 19 + TypeScript، عربية RTL،
وتستهلك نفس REST API — بلا أي منطق أعمال مكرر في العميل.

| الصفحة | المسار | المحتوى |
| :--- | :--- | :--- |
| الدخول والتسجيل | `/login` | دخول، إنشاء وكالة جديدة، وحسابات تجريبية بنقرة |
| نظرة عامة | `/` | مؤشرات المعتمرين والمقاعد والجوازات، شريط الحالات، أحدث المعتمرين، تقدم المجموعات، وملخص الفوترة |
| المعتمرون | `/pilgrims` | بحث وترقيم وتصفية بالحالة، إضافة معتمر، وحذف (للمدير) |
| ملف المعتمر | `/pilgrims/[id]` | البيانات، قائمة التحقق، رفع وثيقة مع MRZ، توثيق/تنزيل/حذف، وتغيير الحالة |
| المجموعات | `/groups` | إنشاء مجموعة، إضافة/إزالة أعضاء، قائد المجموعة، ونسبة الإشغال |
| الفوترة | `/invoices` | مؤشرات المبالغ والضريبة، إنشاء مسودة ببنود وحساب فوري، إصدار، سداد، إلغاء، عرض QR، وتنزيل XML |
| الإعدادات | `/settings` | ملف الوكالة (الاسم/الرقم الضريبي/السجل/العنوان) وجاهزية ZATCA، للقراءة أو التعديل حسب الدور |

### الوكيل والجلسة

- **Same-origin proxy:** لا يعرف المتصفح عنوان الـ backend؛ `next.config.ts` يعيد توجيه `/api/:path*`
  إلى `API_URL`. لذلك تعمل المعاينة خلف أي نطاق دون CORS.
- **الملفات المحمية:** تنزيل الوثائق وXML وQR تمر عبر `fetch` مع ترويسة `Authorization` ثم تُعرض/تُنزَّل
  كـ Blob — لا روابط عامة.
- **الجلسة:** يُحفظ JWT في `localStorage` ويُستأنف عبر `/api/auth/me` عند التحميل، وأي `401`
  يعيد التوجيه إلى `/login`.

> ⚠️ تخزين الرمز في `localStorage` مناسب للنسخة التجريبية؛ الانتقال إلى جلسة `httpOnly`
> عبر Auth.js v5 مدرج في خارطة الطريق.

### الصلاحيات في الواجهة

الخادم هو المرجع النهائي، والواجهة تخفي ما لا يملكه الدور:

| الدور | ما يظهر في الواجهة |
| :--- | :--- |
| `ADMIN` | كل شيء: الحذف، إلغاء الفواتير، وتعديل ملف الوكالة |
| `OPERATOR` | إضافة/تعديل المعتمرين والمجموعات والوثائق، وإنشاء الفواتير وإصدارها وسدادها |
| `SUPERVISOR` | إدارة المعتمرين والمجموعات وأعضائها، وتوثيق الوثائق، وإنشاء الفواتير (بلا إصدار/إلغاء) |
| `VIEWER` | قراءة فقط — تُخفى كل أزرار الكتابة |

### ملاحظات وحدة التحكم (Console) والأمان

قد تظهر في وحدة تحكم المتصفح داخل بيئة المعاينة تحذيران لا علاقة لهما بالتطبيق:

| الرسالة | المصدر | التأثير |
| :--- | :--- | :--- |
| `Loading the script '...' violates ...` (Report-Only) | طبقة الاستضافة/البروكسي في المعاينة تحقن رأس `Content-Security-Policy-Report-Only` — تطبيقنا لا يرسل أي سياسة CSP وحمّل سكريبتاته من نفس النطاق فقط | لا شيء — الوضع «تسجيل فقط» ولا يُحجب أي مورد |
| `The deferred DOM Node could not be resolved to a valid node` | تحذير داخلي من Chrome DevTools حين تتبع عقدة أعاد React رسمها أو حذفها أثناء التحديث | لا شيء — مرتبط بأداة الفحص لا بتطبيق |

التطبيق يرسل رؤوس حماية آمنة لا تكسر أي وضع استضافة: `X-Content-Type-Options`، `Referrer-Policy`،
`Permissions-Policy`، وسياسة CSP محدودة (`object-src 'none'; base-uri 'self'; form-action 'self'`).

**لنشر إنتاجي خلف بروكسي خاص بك**، أضف سياسة صارمة مع nonce عبر middleware (كما في توثيق Next.js):

```ts
// middleware.ts — يولّد nonce لكل طلب ويمرّره إلى Next.js لتوقيع سكريبتاته المضمّنة
const nonce = btoa(crypto.randomUUID());
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'nonce-${nonce}'`,
  `style-src 'self' 'unsafe-inline'`, // خصائص style={{}} داخل React
  `img-src 'self' data: blob:`,       // رموز QR تُعرض عبر blob
  `connect-src 'self'`,
  `font-src 'self' data:`,
  `object-src 'none'; base-uri 'self'; form-action 'self'`,
  // لا تضف frame-ancestors إن أردت تضمين التطبيق في iframe
].join('; ');
```

على مستوى بروكسي الاستضافة نفسه يمكن حذف رأس `Content-Security-Policy-Report-Only` أو توسيع
`script-src` فيه — لكن ذلك إعداد لطبقة الاستضافة لا للتطبيق.

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
| `GET` | `/api/pilgrims/:id/documents` | ملفات المعتمر + قائمة التحقق | كل الأدوار |
| `POST` | `/api/pilgrims/:id/documents` | رفع وثيقة (multipart: `file`, `type`, `ocrText`) | `ADMIN` `OPERATOR` `SUPERVISOR` |
| `GET` | `/api/documents/:id` | بيانات وثيقة | كل الأدوار |
| `GET` | `/api/documents/:id/download` | تنزيل الملف (يتطلب رمز الوكالة المالكة) | كل الأدوار |
| `PATCH` | `/api/documents/:id/verify` | توثيق/إلغاء توثيق | `ADMIN` `SUPERVISOR` |
| `DELETE` | `/api/documents/:id` | حذف الوثيقة وملفها | `ADMIN` `SUPERVISOR` |
| `GET` | `/api/tenant` | بيانات الوكالة وهوية البائع | كل الأدوار |
| `PATCH` | `/api/tenant` | تحديث الاسم/الرقم الضريبي/السجل التجاري | `ADMIN` |
| `GET` | `/api/invoices?status=&page=` | قائمة الفواتير + ملخص مالي | كل الأدوار |
| `GET` | `/api/invoices/stats` | مؤشرات الفوترة والضريبة | كل الأدوار |
| `POST` | `/api/invoices` | إنشاء فاتورة (مسودة) ببنودها | `ADMIN` `OPERATOR` `SUPERVISOR` |
| `GET` | `/api/invoices/:id` | تفاصيل فاتورة | كل الأدوار |
| `POST` | `/api/invoices/:id/issue` | إصدار: رقم متسلسل + UUID + QR + hash | `ADMIN` `OPERATOR` |
| `POST` | `/api/invoices/:id/pay` | تسجيل السداد | `ADMIN` `OPERATOR` |
| `POST` | `/api/invoices/:id/cancel` | إلغاء فاتورة | `ADMIN` |
| `DELETE` | `/api/invoices/:id` | حذف مسودة/ملغاة فقط | `ADMIN` |
| `GET` | `/api/invoices/:id/qr` | فك TLV للرمز | كل الأدوار |
| `GET` | `/api/invoices/:id/qr.svg` | رمز QR قابل للمسح | كل الأدوار |
| `GET` | `/api/invoices/:id/xml` | UBL 2.1 XML للفاتورة | كل الأدوار |

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

## 📄 الوثائق والتحقق (MRZ)

كل معتمر له قائمة تحقق من الوثائق، والوثائق **هي** محرك حالة المعتمر:

| الوثائق | الحالة الناتجة تلقائياً |
| :--- | :--- |
| لا شيء | `DRAFT` |
| أي ملف مرفوع | `REGISTERED` |
| الجواز + الصورة (المطلوبتان) مرفوعتان | `DOCUMENTS_UPLOADED` |
| كل المطلوب موثّق والجواز ساري | `READY_FOR_BOOKING` |
| حذف وثيقة مطلوبة | تراجع إلى الحالة الأدنى المناسبة |

> الحالات المتقدمة (`BOOKED`, `PERMIT_ISSUED`, `COMPLETED`, `CANCELLED`) لا تُلمس آلياً.

**التحقق من الجواز:** يُرسَل الرمز الآلي (سطرا MRZ من أسفل صفحة الجواز) مع الملف فيُقرأ
حتمياً وفق ICAO 9303:

- التحقق من أرقام التحقق (`check digits`) للجواز وتاريخ الميلاد والانتهاء والرقم الشخصي والمركّب.
- استخراج: رقم الجواز، الاسم، الجنسية، تاريخ الميلاد، الجنس، تاريخ الانتهاء، الدولة المُصدرة.
- مطابقة رقم الجواز وتاريخ الانتهاء مع سجل المعتمر، وإظهار أي تعارض بوضوح.
- الوثيقة تصبح `verified` فقط إذا صحّت أرقام التحقق ولم يوجد أي تعارض.

**محرك OCR قابل للاستبدال:** الواجهة `OcrAdapter` تفصل قراءة الصورة عن التحليل.
الافتراضي `NoopOcrAdapter` (إدخال يدوي للـ MRZ من قِبل الموظف). لتفعيل قراءة آلية من الصورة
أضف محوّلاً (Tesseract / Textract / Vision) يطبّق `recognize()` — بقية المسار لا تتغير.

**أمان الملفات:**

- الأنواع المسموحة فقط: `image/jpeg`, `image/png`, `image/webp`, `application/pdf` — بحد أقصى `MAX_UPLOAD_MB` (5 افتراضياً).
- تُخزَّن الملفات خارج جذر الويب بمفاتيح تحمل `tenantId/pilgrimId`، ولا تُخدم كروابط عامة إطلاقاً.
- التنزيل يمرّ عبر نقطة محمية بالرمز، ومن وكالة أخرى يعيد `404` (تم اختباره).
- تنقية أسماء الملفات ومنع تجاوز المسار (path traversal) و`X-Content-Type-Options: nosniff`.

**التحقق اليدوي:** يمكن للمشرف أو المدير توثيق صورة شخصية أو أي وثيقة يدوياً بنقرة،
وإلغاء التوثيق، وهذا يحدّث جاهزية الحجز فوراً.


---

## 🧾 الفوترة الإلكترونية (ZATCA)

فاتورة مبسّطة متوافقة مع متطلبات **ZATCA Phase 1**، والعمليات الحتمية كلها قابلة للتحقق:

| المتطلب | التنفيذ |
| :--- | :--- |
| تسلسل الأرقام | `INV-{YYYY}-{0001}` لكل وكالة/سنة، يُخصَّص عند الإصدار فقط |
| QR (TLV / base64) | الوسوم 1-5: اسم البائع، الرقم الضريبي، الطابع الزمني، الإجمالي شامل الضريبة، مبلغ الضريبة |
| UUID للفاتورة | `crypto.randomUUID()` |
| سلسلة التجزئة | `SHA-256(previousHash + XML)` — كل فاتورة مرتبطة بسابقتها |
| UBL 2.1 XML | `InvoiceTypeCode 388` بنوع `0100000`، أطراف، ضريبة، بنود، QR مضمّن |
| ضريبة القيمة المضافة | 15% افتراضياً (قابلة للضبط 0-50%) بتقريب نصفي لكل بند ثم للإجمالي |

```bash
# 1) إنشاء مسودة
curl -X POST http://localhost:4000/api/invoices \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"buyerName":"شركة النور","items":[{"description":"باقة عمرة","quantity":2,"unitPrice":500}]}'

# 2) الإصدار (يولّد الرقم والـ QR والـ hash)
curl -X POST http://localhost:4000/api/invoices/$ID/issue -H "authorization: Bearer $TOKEN"

# 3) المخرجات القابلة للتسليم
curl -H "authorization: Bearer $TOKEN" http://localhost:4000/api/invoices/$ID/qr.svg -o qr.svg
curl -H "authorization: Bearer $TOKEN" http://localhost:4000/api/invoices/$ID/xml -o invoice.xml
```

**دورة الحياة:**

```
DRAFT ──issue──▶ ISSUED ──pay──▶ PAID
  │                 │
  └───cancel────────┴──▶ CANCELLED
```

- لا إصدار مرتين، ولا دفع لمسودة، ولا إلغاء لمدفوعة — كلها `409`.
- الفاتورة الصادرة غير قابلة للحذف (تبقى للسجل الضريبي)؛ المسودة والملغاة قابلتان.
- هوية البائع (الاسم، الرقم الضريبي 15 رقماً، السجل التجاري، العنوان) تُدار من `/api/tenant`
  وتظهر في QR و XML لكل فاتورة جديدة.

> **نطاق صريح:** التوقيع الرقمي (XAdES / CSID) والربط الفعلي ببوابة Fatoora يتطلبان
> اعتماد ZATCA (OTP + شهادات) — غير منفّذ هنا. أما الرمز والـ hash والسلسلة و UBL فهي
> المكوّنات الحتمية القابلة للاختبار والمطابقة.

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

**38 اختباراً تكاملياً** تغطي: الصحة والصفحة الرئيسية، رفض الطلبات غير الموثقة، الدخول
(نجاح/فشل)، `/auth/me`، إدارة المستخدمين، تسجيل وكالة جديدة وعزلها، منع انتحال الوكالة
بترويسة، CRUD المعتمرين، البحث والتصفية والتحقق، الجواز المكرر، صلاحيات الأدوار،
المجموعات والأعضاء، ومؤشرات اللوحة — إضافة إلى الوثائق: قراءة MRZ وأرقام التحقق،
كشف التعارض مع السجل، تدرّج حالة المعتمر صعوداً وهبوطاً، رفض الصيغ/الحجم، التنزيل المحمي
وعزل الوكالات، وصلاحيات الرفع والتوثيق — وأيضاً الفوترة: حساب الضريبة والتقريب، التحقق
من المدخلات، الإصدار والتسلسل و UUID، فك ترميز QR ومطابقة قيمه، تسلسل الـ hash، UBL XML
وتهريب الرموز، دورة الحياة والقيود، صلاحيات الأدوار، عزل الوكالات، وهوية البائع.

---

## 🗺️ خارطة الطريق

- [x] Monorepo + Turborepo
- [x] Prisma Schema (8 نماذج)
- [x] RLS Policies + دور التطبيق
- [x] NestJS API — معتمرون / مجموعات / لوحة مؤشرات
- [x] مصادقة JWT + أدوار + تسجيل وكالة جديدة
- [x] لوحة عمليات عربية (RTL) + شاشة دخول وواجهة حسب الدور (HTML احتياطية)
- [x] لوحة وثائق داخل الواجهة: قائمة تحقق، رفع، تنزيل، توثيق
- [x] تبويب الفوترة: إنشاء، إصدار، سداد، رمز QR، وتنزيل XML
- [x] اختبارات e2e + CI + Docker Compose
- [ ] Auth.js v5 في واجهة Next.js (استخدام نفس الـ API)
- [x] رفع الوثائق + تحقق MRZ (ICAO 9303) + محرك OCR قابل للاستبدال
- [x] الفوترة الإلكترونية + QR/TLV + UBL XML + hash chain (ZATCA Phase 1)
- [ ] إشعارات WhatsApp/SMS عبر BullMQ
- [x] واجهة Next.js 15 كاملة: معتمرون، مجموعات، وثائق، فوترة، وإعدادات

---

## 📄 الرخصة

Proprietary © 2026 Mamourgroupe
