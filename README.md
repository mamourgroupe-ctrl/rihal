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

- لوحة التحكم: <http://localhost:4000/>
- صفحة الحالة: <http://localhost:4000/status.html>
- واجهة البرمجة: <http://localhost:4000/api> و`/api/health`
- بيانات الدخول التجريبية: الوكالة `seed-agency-north` والمستخدم `admin@north.seed.invalid`
  (كلمة المرور يطبعها أمر `db:demo-user`).

> يستخدم المشروع دورَي PostgreSQL منفصلين: `rihal_app` للتشغيل (مع RLS) و`rihal_migrator`
> للهجرات والبذور. راجع `packages/database/prisma/roles-bootstrap.sql` و`.env.example`.

---

## 🧰 بيئة التطوير (VS Code + وكلاء ذكاء اصطناعي)

بيئة الفريق كاملة داخل المستودع: مهمات جاهزة، تصحيح متعدد الأهداف، تمديدات مقترحة،
وكلاء متخصصون لكل طبقة، وسير بناء للجوال.

```bash
powershell -ExecutionPolicy Bypass -File tooling/setup/windows.ps1   # أو macos.sh / linux.sh
corepack pnpm install
node tooling/doctor.mjs      # تقرير جاهزية: Node, JDK, Android SDK, PostgreSQL, VS Code
code .
```

| ما تحتاجه | أين |
| --- | --- |
| دليل التهيئة الكامل | [`docs/dev-environment.md`](docs/dev-environment.md) |
| المهام والتصحيح | `.vscode/tasks.json` · `.vscode/launch.json` |
| فحص البيئة | `node tooling/doctor.mjs` |
| وكلاء متخصصون (معماري، API، بيانات، أندرويد، iOS، جودة، أمن، مراجع) | `.github/chatmodes/` |
| قواعد تلقائية حسب المسار | `.github/instructions/` · `.github/copilot-instructions.md` |
| قوالب أوامر (`/new-endpoint`, `/fix-bug`, `/mobile-release`) | `.github/prompts/` |
| أدوات خارجية للوكلاء (GitHub, Playwright, Context7, Postgres) | `.vscode/mcp.json` |
| وكلاء Claude Code الفرعيون (6 تخصصات) | `.claude/agents/` · `CLAUDE.md` |
| بناء أندرويد وiOS في CI | `.github/workflows/android.yml` · `ios.yml` |

> iOS لا يُبنى على Windows؛ الـworkflow أعلاه هو المسار المعتمد (macOS runner).

---

## 📱 تطبيق أندرويد

الواجهة (`apps/api/public`) صارت تطبيقًا قابلًا للتثبيت، ويوجد غلاف Capacitor جاهز لبناء APK/AAB:

| المسار | الناتج | الأمر |
| :--- | :--- | :--- |
| PWA | تثبيت من Chrome بلا متجر | افتح رابط الوكالة عبر HTTPS واختر «تثبيت التطبيق» |
| APK/AAB | ملف تثبيت/نشر في Google Play | `cd apps/mobile && pnpm prepare:web && pnpm exec cap sync android && cd android && ./gradlew assembleDebug` |

- يعمل بلا اتصال لهيكل الواجهة فقط؛ استجابات `/api/` **لا تُخزَّن** على الجهاز (بيانات جوازات وتأمين).
- الوضع البعيد الموصى به: `RIHAL_SERVER_URL=https://your-console.example pnpm prepare:web` — يفتح التطبيق الواجهة من أصلها الحقيقي فتبقى الجلسة first-party.
- الوضع المضمَّن: بدون متغيّر، يطلب التطبيق عنوان الخادم في أول تشغيل ويحفظه على الجهاز.
- الأيقونة المصدرية: `apps/mobile/resources/icon-source.png` (أيقونات PWA في `apps/api/public/icons/`، وأيقونات أندرويد وشاشات البداية في `apps/mobile/android/app/src/main/res/`).

الدليل الكامل (JDK/SDK، التوقيع، CORS، حدود المراحل 5–6): [`docs/android.md`](docs/android.md).

---

## 🗺️ خارطة الطريق

- [x] Monorepo + Turborepo
- [x] Prisma Schema (9 جداول)
- [x] Neon PostgreSQL
- [x] RLS Policies
- [x] NestJS API (صحة الخدمة + المصادقة والجلسات)
- [x] واجهة عمليات تفاعلية (معتمرون، مجموعات، وثائق، فواتير، فريق)
- [x] PWA قابلة للتثبيت + غلاف Capacitor لأندرويد
- [ ] تخزين خاص لملفات الوثائق (المرحلة 5)
- [ ] إشعارات فورية (Push) (المرحلة 6)

---

## 📄 الرخصة

Proprietary © 2026 Mamourgroupe