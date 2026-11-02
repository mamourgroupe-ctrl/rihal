# تحويل رحّال إلى تطبيق أندرويد

الواجهة الحالية (`apps/api/public`) هي تطبيق ويب بلا خطوة بناء، وهذا يجعل تحويلها إلى تطبيق أندرويد مباشرًا. هناك مسارَان مدعومان في المستودع:

| المسار | ما تحصل عليه | متى تختاره |
| --- | --- | --- |
| **PWA** (جاهز الآن) | تثبيت الشاشة الرئيسية، أيقونة، شاشة كاملة، عمل بلا اتصال للواجهة | أسرع طريق، بلا متجر، تحديثات فورية |
| **Capacitor** (APK/AAB) | ملف `apk`/`aab` قابل للتوزيع أو للنشر في Google Play | تحتاجه المؤسسات أو توزيع المتجر |

المسارَان يستخدمان نفس الكود: لا يوجد سوى مصدر واحد للواجهة.

---

## ١. المسار السريع: PWA (بلا أدوات)

الخادم يقدّم بالفعل:

- `manifest.webmanifest` — الاسم العربي، `dir: rtl`، `display: standalone`، أيقونات 192/512/maskable، واختصارات للمعتمرين/المجموعات/الفواتير.
- `sw.js` — يخزّن هيكل الواجهة فقط؛ **كل ما تحت `/api/` لا يُخزَّن إطلاقًا** (بيانات جوازات وتأمين لا يجوز كتابتها على الجهاز).
- أيقونات في `apps/api/public/icons/` ومصدرها `apps/mobile/resources/icon-source.png`.

خطوات التثبيت على الجهاز:

1. افتح رابط الوكالة في Chrome على أندرويد **عبر HTTPS** (شرط المتصفح لتثبيت PWA).
2. ستظهر دعوة «تثبيت التطبيق» أو من قائمة ⋮ اختر **«تثبيت التطبيق» / Add to Home screen**.
3. سيظهر التطبيق بأيقونة رحّال في الشاشة الرئيسية ويعمل بشاشة كاملة.

> ملاحظة: على `http://localhost` يعمل التسجيل أيضًا (استثناء `isSecureContext`)، لكن التثبيت العادي على أجهزة المستخدمين يتطلب HTTPS.

---

## ٢. مسار Capacitor: بناء APK

الحزمة `apps/mobile` جاهزة مع مشروع أندرويد مُولَّد في `apps/mobile/android`.

### المتطلبات (على جهاز البناء لا في هذا المستودع)

- JDK 21 وAndroid SDK (يُنصح بـ Android Studio) و`ANDROID_HOME` مضبوطًا.
- Node 22 وpnpm 9.

### الأوامر

```bash
corepack pnpm install
cd apps/mobile

# 1) انسخ الواجهة من apps/api/public إلى www وزرع عنوان الخادم
corepack pnpm prepare:web

# 2) زامن الأصول مع مشروع أندرويد (يُعاد بعد كل تعديل واجهة)
corepack pnpm exec cap sync android

# 3) ابنِ APK للتجربة
cd android && ./gradlew assembleDebug
#    الملف: android/app/build/outputs/apk/debug/app-debug.apk
```

للإصدار الموقّع:

```bash
keytool -genkey -v -keystore rihal-release.jks -alias rihal -keyalg RSA -keysize 2048 -validity 10000
# ضع كلمات المرور في android/keystore.properties (غير مُتعقَّب في Git)
cd apps/mobile/android && ./gradlew bundleRelease   # AAB لمتجر Play
```

أضف إلى `android/app/build.gradle` كتلة `signingConfigs` عند الحاجة إلى توقيع تلقائي.

### عنوان الخادم: وضعان

**أ) الوضع البعيد (موصى به)**

```bash
cd apps/mobile && RIHAL_SERVER_URL=https://console.example.sa corepack pnpm prepare:web
corepack pnpm exec cap sync android
```

يفتح التطبيق واجهة الوكالة من عنوانها الحقيقي داخل WebView، فيبقى كوكي التجديد **first-party** ولا حاجة لأي إعداد CORS.

**ب) الوضع المضمَّن**

اترك `RIHAL_SERVER_URL` فارغًا: يُنسخ مجلد `www` داخل التطبيق، وفي أول تشغيل تظهر شاشة عربية تطلب **عنوان الخادم**، ويُحفظ محليًا (`localStorage: rihal.server`) ويمكن تغييره بإضافة `?server=https://...` إلى الرابط.

---

## ٣. ما يجب ضبطه في الخادم عند الوضع المضمَّن أو الويب عبر نطاق آخر

الواجهة تستدعي `api/` نسبيًا افتراضيًا، ويدعم `app.js` تجاوزًا عبر `window.RIHAL_API_BASE` (يمرّره `native-boot.js`). عند الاتصال من أصل مختلف:

1. **CORS:** أضف أصل التطبيق إلى `APP_ORIGINS`، مثال:
   ```dotenv
   APP_ORIGINS="https://console.example.sa,capacitor://localhost,http://localhost"
   ```
2. **كوكي التجديد:** الكود يضبط `sameSite: 'strict'` في `auth.controller.ts`. الكوكي المتقاطع يحتاج `SameSite=None; Secure` على HTTPS. الوضع البعيد يتفادى المشكلة أصلًا لأنه يخدم الواجهة من نفس الأصل.
3. **الجلسة تنتهي سريعًا؟** رمز الوصول قصير العمر والتجديد يعتمد على الكوكي؛ في الوضع المضمَّن يمكن للوكالة إطالة عمر رمز الوصول أو استخدام الوضع البعيد.

---

## ٤. التحقق من سلامة الحزمة

- `apps/mobile/www` ناتج مُولَّد (غير مُتعقَّب في Git) ويُعاد إنشاؤه بـ`prepare:web`.
- مشروع `apps/mobile/android` **مُتعقَّب** لأن تضمينه يجعل البناء قابلًا للتكرار؛ تُستثنى منه مخرجات `build/` و`.gradle/` و`local.properties`.
- الأيقونات: `res/mipmap-*/ic_launcher*.png` و`ic_launcher_foreground.png` مشتقة من `apps/mobile/resources/icon-source.png`، وشاشات البداية `res/drawable*/splash.png` بلون العلامة `#0B3D26`.
- في `AndroidManifest.xml` عُطّل `allowBackup` وأُضيفت قواعد `data_extraction_rules` كي لا تُنسخ جلسات WebView إلى النسخ الاحتياطي.

## ٥. حدود معروفة الآن

- بناء APK **لم يُنفَّذ** داخل بيئة العمل هذه (لا JDK/SDK)، لذلك أول `./gradlew assembleDebug` سيتم على جهازك أو في CI. مشروع Gradle نفسه مُولَّد من Capacitor 8.6.0.
- الإشعارات الفورية (Push) تحتاج إضافة `@capacitor/push-notifications` + مفاتيح FCM، وهي مرتبطة بمرحلة الإشعارات (المرحلة 6) غير المبدوءة.
- رفع صور الوثائق من الكاميرا يحتاج المرحلة 5 (تخزين خاص)، وحاليًا تُسجَّل الوثائق بمفتاح تخزين نصي فقط.
