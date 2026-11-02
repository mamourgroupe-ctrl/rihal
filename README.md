<div align="center">

# 🕌 Rihal | رحال

### منصة SaaS متعددة المستأجرين لإدارة عمليات وكالات الحج والعمرة

**Multi-tenant SaaS platform for Hajj and Umrah agency operations**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-red)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org/)

</div>

---

## 🎯 المشكلة التي يحلها

وكالات الحج والعمرة تدير مواسمها عبر واتساب وجداول Excel. هذا يسبب أخطاء وفقدان معلومات وإهدار ساعات.

**Rihal** يبني الطبقة التشغيلية المفقودة: إدارة المعتمرين، المجموعات، الوثائق، والفوترة.

---

## 🏗️ المعمارية التقنية

| الطبقة | التقنية |
| :--- | :--- |
| Frontend | Next.js 15 + React 19 + TypeScript |
| Backend | NestJS 11 + TypeScript |
| Database | PostgreSQL 16 (Neon) + RLS |
| ORM | Prisma 6 |
| Cache/Queue | Redis 7 (Upstash) + BullMQ |
| Auth | Auth.js v5 |
| Monorepo | Turborepo + pnpm |

---

## 🚀 البدء السريع

```bash
git clone https://github.com/mamourgroupe-ctrl/rihal.git
cd rihal
pnpm install
cp .env.example .env        # ثم عدّل DATABASE_URL / DIRECT_URL / AUTH_SECRET
pnpm db:generate            # لا ينزّل أي محرّك ثنائي: query compiler + pg
pnpm --filter @rihal/database db:migrate
pnpm db:seed
pnpm --filter @rihal/database db:demo-user   # كلمة مرور حقيقية لمستخدم تجريبي
pnpm --filter @rihal/api dev                 # http://localhost:4000
```

بعد التشغيل:

- لوحة التحكم: <http://localhost:4000/dashboard.html>
- صفحة الحالة: <http://localhost:4000/>
- واجهة البرمجة: <http://localhost:4000/api> و`/api/health`
- بيانات الدخول التجريبية: الوكالة `seed-agency-north` والمستخدم `admin@north.seed.invalid`
  (كلمة المرور يطبعها أمر `db:demo-user`).

> يستخدم المشروع دورَي PostgreSQL منفصلين: `rihal_app` للتشغيل (مع RLS) و`rihal_migrator`
> للهجرات والبذور. راجع `packages/database/prisma/roles-bootstrap.sql` و`.env.example`.


---

## 🗺️ خارطة الطريق

- [x] Monorepo + Turborepo
- [x] Prisma Schema (9 جداول)
- [x] Neon PostgreSQL
- [x] RLS Policies
- [x] NestJS API (صحة الخدمة + المصادقة والجلسات)
- [ ] Next.js Frontend
- [x] لوحة تحكم للعمليات (ملخص المعتمرين والمجموعات والفواتير والوثائق)
- [ ] إدارة المعتمرين (إنشاء وتعديل من الواجهة)

---

## 📄 الرخصة

Proprietary © 2026 Mamourgroupe