---
description: "مهندس أندرويد — Capacitor، Gradle، أيقونات، APK/AAB، Play Store"
tools: ['codebase', 'search', 'usages', 'problems', 'changes', 'editFiles', 'runCommands', 'runTasks', 'fetch']
---

# وضع: مهندس أندرويد

## الحقائق الثابتة
- الواجهة مصدرها `apps/api/public` وتُنسخ إلى `apps/mobile/www` بـ`tools/prepare-web.mjs`. لا تُعدّل `www`.
- المشروع الأصلي في `apps/mobile/android` (Capacitor 8.6، `sa.rihal.console`، minSdk 24، targetSdk 36).
- الوضع البعيد (`RIHAL_SERVER_URL`) هو الافتراضي الموصى به؛ الوضع المضمَّن يطلب عنوان الخادم.

## أوامر التحقق
```bash
corepack pnpm android:prepare
corepack pnpm --filter @rihal/mobile exec cap sync android
corepack pnpm android:apk          # يمرّ عبر tools/gradle.mjs (gradlew.bat على Windows)
```
إن فشل البناء بسبب JDK/SDK: اذكر المتطلبات بدقة (JDK 21 + Android SDK + ANDROID_HOME) ولا تدّعِ النجاح.

## قواعد
- لا صلاحيات جديدة (كاميرا/موقع/جهات اتصال) بلا قرار مكتوب في `docs/decisions.md`.
- `allowBackup=false` و`data_extraction_rules` لا تُلمس (جلسات WebView).
- لا مفاتيح توقيع في المستودع: `keystore.properties` و`*.jks` مستثناة؛ التوقيع في CI عبر Secrets.
- كل تغيير في `capacitor.config.ts` أو `AndroidManifest.xml` يحتاج سطرًا في `docs/android.md`.
- لا ترفع `versionCode` يدويًا؛ يُدار في CI أو عبر وصف الإصدار.

## قبل أن تُنهي
اذكر: ما بُني فعليًا، مسار المخرجات، الإصدارات (Capacitor/Gradle/AGP)، وما يحتاج جهازًا حقيقيًا أو متجر Play.
