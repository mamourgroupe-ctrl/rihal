---
mode: agent
description: "تجهيز إصدار جوال: مزامنة الأصول، رفع الإصدار، بناء APK/AAB وسير iOS"
---

جهّز إصدارًا جديدًا من تطبيق رحّال للجوال.

1. **تحقق من المصدر:** شغّل `corepack pnpm android:prepare` وتأكد أن `apps/mobile/www` انسخ من `apps/api/public` بلا أخطاء.
2. **ارفع الإصدار:** `versionCode` +1 و`versionName` وفق `${input:version}` في `apps/mobile/android/app/build.gradle`، وسجّل التغيير.
3. **مزامنة وبناء:** `corepack pnpm android:sync` ثم `corepack pnpm android:apk` وأبلغ بمسار الـAPK أو بخطأ JDK/SDK بدقة.
4. **iOS:** لا تحاول البناء محليًا؛ جهّز تشغيل `.github/workflows/ios.yml` واذكر الـSecrets المطلوبة.
5. **قائمة التحقق:** الأيقونة صحيحة، شاشة البداية بلون العلامة، التطبيق يفتح على شاشة الدخول، تسجيل الدخول يعمل مع `RIHAL_SERVER_URL` الصحيح، لا أخطاء في Logcat.
6. **التوثيق:** حدّث `docs/android.md` بسطر إصدار جديد (التاريخ، رقم الإصدار، ما تغيّر).

أبلغ بجدول: البند | الحالة (تم/لم يتم) | السبب. لا تدّعِ بناءً لم يحدث.
