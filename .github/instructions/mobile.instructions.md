---
applyTo: "apps/mobile/**"
---

# قواعد حزمة الجوال (Capacitor)

- **مصدر واحد:** `apps/mobile/www` مُولَّد من `apps/api/public` عبر `tools/prepare-web.mjs`. لا تعدّل `www` يدويًا ولا تُتعقّبه في Git.
- **الوضعان:** بعيد (`RIHAL_SERVER_URL` → الأصل الحقيقي للواجهة، والجلسة first-party) ومضمَّن (شاشة اختيار الخادم). أي تغيير يجب أن ينجح في الوضعين.
- **عنوان الخادم:** يُمرَّر عبر `native-config.js` → `window.RIHAL_NATIVE_CONFIG.defaultServer`، ويُحترم `localStorage['rihal.server']` و`?server=`.
- **الأمان:** لا يقرأ الغلاف جهات الاتصال/الكاميرا/الموقع. لا تُفعّل `allowMixedContent`. `allowBackup=false` يبقى كما هو.
- **الجلسة:** لا تخزّن رموزًا طويلة العمر على الجهاز؛ الكوكي مسؤول الخادم.
- **iOS:** مشروع `ios/` يُولَّد على macOS فقط (`cap add ios`). لا تُضِف ملفات Xcode يدوية؛ استخدم `.github/workflows/ios.yml`.
- **التحقق:** `corepack pnpm prepare:web && corepack pnpm exec cap sync android` يجب أن ينجح قبل أي commit، و`node tooling/doctor.mjs` يبيّن حالة JDK/SDK.
