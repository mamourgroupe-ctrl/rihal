# بيئة تطوير رحّال الاحترافية — أندرويد + iOS + وكلاء الذكاء الاصطناعي

> هذا الدليل يبني **بيئة فريق واحدة** قابلة للتكرار: نفس الأدوات، نفس الإعدادات، نفس الوكلاء،
> على Windows وmacOS وLinux. كل ما ورد هنا موجود في المستودع ويعمل بأوامر محددة.

---

## ١. الخريطة: ما الذي نبنيه

```
┌─────────────────────────────── VS Code ───────────────────────────────┐
│  الإعدادات والمهام والتصحيح   .vscode/                                │
│  وكلاء متخصصون               .github/chatmodes/ + instructions/       │
│  قوالب أوامر جاهزة           .github/prompts/                         │
│  أدوات خارجية عبر MCP        .vscode/mcp.json                         │
└───────────────┬───────────────────────────────┬──────────────────────┘
                │                               │
      ┌─────────▼─────────┐            ┌────────▼─────────┐
      │  مشروع الويب/API   │            │   تطبيق الجوال    │
      │  NestJS + Prisma   │◄───────────┤  Capacitor 8      │
      │  PostgreSQL + RLS  │  نفس الـAPI │  أندرويد (APK/AAB)│
      │  واجهة ثابتة RTL   │            │  iOS (سحابي/macOS)│
      └─────────┬─────────┘            └────────┬─────────┘
                │                               │
      ┌─────────▼───────────────────────────────▼─────────┐
      │  الجودة: ESLint · Prettier · TypeScript · Vitest   │
      │  الفحص: doctor.mjs · GitHub Actions · Dependabot   │
      └────────────────────────────────────────────────────┘
```

**مبدأ التصميم:** لا أداة تكرّر أخرى، وكل أداة لها أمر واحد معروف، وكل أمر موثّق في مكان واحد.

---

## ٢. جدول الأدوات: ماذا تغطي ولماذا

| الطبقة | الأداة | الدور في رحّال | الأمر / الملف |
| --- | --- | --- | --- |
| وقت التشغيل | Node.js 22 LTS | تشغيل الـAPI والأدوات | `node -v` |
| مدير الحزم | pnpm 9.15 عبر Corepack | monorepo بمساحة مشتركة | `corepack pnpm install` |
| أوركسترا البناء | Turborepo | بناء/اختبار الحزم بالترتيب | `corepack pnpm build` |
| لغة | TypeScript 5.9 | صرامة كاملة في API والحزم | `tsconfig.base.json` |
| خادم الويب | NestJS 11 | API + الواجهة الثابتة | `apps/api` |
| ORM | Prisma 6 (engine-less + pg adapter) | وصول آمن للبيانات | `packages/database` |
| القاعدة | PostgreSQL 16 + RLS | عزل المستأجرين | `prisma/migrations` |
| الاختبار | Vitest 5 | وحدات + تكامل | `apps/api/test` |
| الجودة | ESLint 10 (flat) + Prettier 3 | قواعد صارمة + تنسيق موحّد | `eslint.config.mjs`, `.prettierrc.json` |
| الجوال | Capacitor 8.6 + Gradle | APK/AAB + iOS | `apps/mobile` |
| أندرويد | JDK 21 + Android SDK 36 | بناء وتوقيع | `tooling/setup/*` |
| iOS | Xcode 16 + CocoaPods (macOS) أو CI سحابي | محاكي/TestFlight | `.github/workflows/ios.yml` |
| الفحص البيئي | `tooling/doctor.mjs` | تقرير جاهزية ملوّن | `node tooling/doctor.mjs` |
| الجودة المستمرة | GitHub Actions + Dependabot | فحص كل PR | `.github/workflows/` |
| وكلاء الذكاء | Copilot Chat modes + instructions + MCP | فريق افتراضي متخصص | `.github/`, `.vscode/mcp.json` |

---

## ٣. التهيئة في ١٠ دقائق

### خطوة ١ — الأدوات الأساسية

```powershell
# Windows (PowerShell كمسؤول)
powershell -ExecutionPolicy Bypass -File tooling/setup/windows.ps1
```
```bash
# macOS
bash tooling/setup/macos.sh
# Linux (أوبنتو/دبيان)
sudo bash tooling/setup/linux.sh
```

بعد السكربت: **أغلق الطرفية وافتحها** (لتحديث `PATH`)، ثم:

```bash
corepack pnpm install
cp .env.example .env       # Windows: copy .env.example .env
node tooling/doctor.mjs
```

`doctor` يعطي تقريرًا بهذا الشكل، وكل ✘ يحمل أمر الحل:

```
■ الأساسيات       ✔ Node.js v22  ✔ pnpm v9.15  ✔ git  ! docker
■ أندرويد         ✔ JDK 21      ✔ Android SDK ✔ adb  ✔ Gradle wrapper
■ iOS             ! غير متاح على win32 → يُبنى عبر macOS CI
■ قاعدة البيانات   ✔ DATABASE_URL مضبوط  ✔ PostgreSQL المنفذ مفتوح
■ VS Code         ✔ إعدادات الفريق 4/4
```

### خطوة ٢ — قاعدة البيانات

```bash
docker run -d --name rihal-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=rihal postgres:16
corepack pnpm db:generate
corepack pnpm --filter @rihal/database db:provision-roles
corepack pnpm db:migrate && corepack pnpm db:seed
corepack pnpm --filter @rihal/database db:demo-user
```

> بلا Docker: ثبّت PostgreSQL 16 محليًا وطبّق `packages/database/prisma/roles-bootstrap.sql` بدور مسؤول.

### خطوة ٣ — VS Code

```bash
code .
```
افتح Command Palette (`Ctrl+Shift+P`) → **Extensions: Show Recommended Extensions** → ثبّت الكل.

التمديدات المختارة لكل طبقة:

| التمديد | لماذا |
| --- | --- |
| GitHub Copilot + Copilot Chat | الوكلاء الأساسيون |
| ESLint + Prettier + EditorConfig | صرامة وتنسيق موحّد |
| Prisma | إبراز/تحقق/تنسيق `schema.prisma` |
| Vitest | تشغيل ومراقبة الاختبارات من الشريط الجانبي |
| Java Pack + Android Dev | تعديل وتصحيح مشروع Capacitor |
| XML + YAML + GitHub Actions | ملفات أندرويد والـworkflows |
| GitLens + Git Graph | تاريخ وأفرع |
| REST Client + Error Lens + Code Spell | تجربة يومية |
| Docker | إدارة القاعدة |
| ShellCheck + markdownlint | جودة السكربتات والتوثيق |

### خطوة ٤ — تحقق من كل شيء

| ماذا | كيف |
| --- | --- |
| API يعمل | `Task: ٣ · تشغيل API (watch)` ← http://localhost:4000 |
| الاختبارات | `Task: ٥ · الاختبارات (API)` |
| بوابة ما قبل الدفع | `Task: ٥ · تحقق كامل قبل الدفع` (lint + typecheck + build + test) |
| الجوال | `Task: ٦ · بناء APK` |
| الواجهة فقط | `Task: ٧ · تشغيل معاينة الواجهة` ← http://localhost:4100 |

---

## ٤. المهام والتصحيح في VS Code

**المهام (`Ctrl+Shift+B` أو `Terminal → Run Task`)** مرقّمة بترتيب اليوم:

| # | المهمة | ماذا تفعل |
| --- | --- | --- |
| ١ | تثبيت التبعيات / فحص البيئة | `pnpm install` و`doctor` |
| ٢ | Prisma | توليد، هجرات، بذور، مستخدم تجريبي |
| ٣ | تشغيل API | watch + inspector على 9229 |
| ٤ | بناء | API أو الكل |
| ٥ | جودة | ESLint، Typecheck، الاختبارات، وبوابة كاملة |
| ٦ | جوال | نسخ الواجهة، مزامنة، APK، فتح Android Studio |
| ٧ | معاينة | خادم ثابت للواجهة على 4100 |

**التصحيح (`F5`)** — تشكيلات جاهزة:

- `API · تشغيل ومراقبة`: يشغّل watch مع inspector ويفتح المتصفح عند `Nest application successfully started`.
- `API · إرفاق إلى عملية تعمل`: لمن بدأ الخادم من طرفية خارجية.
- `اختبارات · الملف الحالي`: يشغّل Vitest على الملف المفتوح مع نقاط توقف.
- `واجهة · Chrome/Edge`: يفتح الواجهة مع DevTools مربوطة بـ`apps/api/public`.
- `أندرويد · WebView`: بعد `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>` تصبح قادرًا على تصحيح الواجهة داخل التطبيق.
- `بيئة كاملة`: تشغيل مركّب للـAPI والمتصفح معًا.

---

## ٥. وكلاء الذكاء الاصطناعي: فريق افتراضي متخصص

الفكرة: **وكيل لكل تخصص**، بصلاحيات وأدوات وسلوك مختلف، بدل وكيل عام يعرف كل شيء ولا يتقن شيئًا.

| الوكيل | الملف | متى تستدعيه | صلاحياته |
| --- | --- | --- | --- |
| مهندس الحلول | `.github/chatmodes/architect.chatmode.md` | قبل أي ميزة: تقسيم، ADR، مخاطر | يقرأ ويخطط، لا يعدّل كود الإنتاج |
| مهندس الـAPI | `backend.chatmode.md` | نقاط نهاية، خدمات، صلاحيات | كامل + تشغيل واختبار |
| مهندس البيانات | `database.chatmode.md` | schema، هجرات، RLS، فهارس | كامل + SQL |
| مهندس أندرويد | `android.chatmode.md` | Capacitor، Gradle، APK، المتجر | كامل + أوامر البناء |
| مهندس iOS | `ios.chatmode.md` | Xcode، CI سحابي، TestFlight | لا يدّعي بناءً محليًا على Windows |
| مهندس الجودة | `qa.chatmode.md` | حالات قبول، اختبارات، تقارير عيوب | يكتب اختبارات فقط |
| المراجع الأمني | `security.chatmode.md` | RLS، مصادقة، أسرار، تبعيات | يقرأ ويراجع ويكتب تقريرًا |
| مراجع الكود | `reviewer.chatmode.md` | قبل الدمج | يقرأ الفرق ويصنّف الحواجز |

**كيف تستخدمها:** في Copilot Chat افتح قائمة الأوضاع أعلى المحادثة واختر الوضع، أو
`Ctrl+Shift+P → Chat: New Mode` لترى الملفات المتاحة.

### ملفات السياق التلقائي (instructions)
تُطبَّق تلقائيًا حسب الملف المفتوح — لا حاجة لكتابة القواعد في كل محادثة:

| الملف | يُطبَّق على |
| --- | --- |
| `.github/copilot-instructions.md` | المستودع كله |
| `.github/instructions/api.instructions.md` | `apps/api/src/**` |
| `database.instructions.md` | `packages/database/**` |
| `console-ui.instructions.md` | `apps/api/public/**` |
| `mobile.instructions.md` | `apps/mobile/**` |
| `tests.instructions.md` | ملفات الاختبار |

### قوالب جاهزة (prompts)
اكتب `/` في Copilot Chat ثم اختر: `new-endpoint`، `fix-bug`، `mobile-release`.

### أدوات خارجية عبر MCP (`.vscode/mcp.json`)
| الخادم | الفائدة |
| --- | --- |
| `github` | قراءة الـPRs والـissues من داخل المحادثة |
| `playwright` | تشغيل المتصفح وفحص الواجهة فعليًا (أندرويد/ويب) |
| `context7` | توثيق محدَّث للمكتبات (NestJS, Capacitor, Prisma) |
| `postgres` | استعلام مخطط/بيانات القاعدة أثناء المراجعة |

> على Windows إن فشل `npx` استخدم `npx.cmd` في `mcp.json`. كل خادم يحتاج موافقة أولى من VS Code.

### أدوات أخرى تقرأ نفس القواعد
- **Claude Code / Codex CLI / Gemini CLI / Cursor**: تقرأ `AGENTS.md` في الجذر — وهو يشير إلى نفس التعليمات.
- **GitHub Copilot في المتصفح**: يقرأ `.github/copilot-instructions.md` من الفرع الافتراضي.

---

## ٦. دورة العمل اليومية

```
1) architect      → خطة + معايير قبول + ADR
2) backend/db     → تنفيذ + اختبارات  (Task: ٥ · تحقق كامل قبل الدفع)
3) qa             → حالات قبول واختبارات حدّية
4) security       → مراجعة RLS/صلاحيات (إلزامي لأي تغيير في البيانات)
5) reviewer       → حاجب/مطلوب/اقتراح
6) push           → CI: lint · typecheck · build · test · audit
7) android / ios  → workflows تبني APK/AAB وسيولة المحاكي
```

**قاعدة الفرع:** `feat|fix|docs/<scope>` من `main`، ودمج فقط بعد CI أخضر + مراجعة.

---

## ٧. بناء الجوال: الحقيقة الكاملة

| الهدف | من أين | الأمر |
| --- | --- | --- |
| APK تجريبي | أي نظام (Windows/Linux/macOS) | `pnpm android:apk` ← `apps/mobile/android/app/build/outputs/apk/debug/` |
| AAB لمتجر Play | أي نظام | `pnpm --filter @rihal/mobile android:bundle` |
| تثبيت على جهاز | `adb install -r app-debug.apk` | فعّل USB debugging |
| iOS محاكي | macOS أو CI | `.github/workflows/ios.yml` |
| IPA/TestFlight | macOS + شهادة Apple | نفس الـworkflow مع Secrets |

**على Windows تحديدًا:** لا يمكن بناء iOS محليًا. المسار: GitHub Actions على `macos-latest`،
أو خدمة سحابية (Codemagic / EAS). ما يلزم من أسرار موثّق داخل الـworkflow.

### الأسرار المطلوبة في GitHub (Settings → Secrets)
| الاسم | الاستخدام |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | توقيع APK/AAB |
| `APPLE_CERT_P12`, `APPLE_CERT_PASSWORD`, `APPLE_TEAM_ID`, `APPLE_PROVISION_PROFILE` | توقيع iOS |
| `APP_STORE_CONNECT_*` | رفع TestFlight |
| `RIHAL_SERVER_URL` (Variable لا Secret) | عنوان الخادم المضمَّن في البناء |

---

## ٨. الأمان داخل بيئة التطوير

1. **لا أسرار في Git:** `.env` و`*.jks` و`keystore.properties` متجاهلة. أي مفتاح يظهر في محادثة وكيل يُعدّ مسرّبًا ويُستبدل.
2. **المفاتيح في المطوّر فقط:** استخدم مدير أسرار (1Password/Bitwarden) أو Secrets في GitHub.
3. **بيانات المرضى/المعتمرين:** لا تنسخ بيانات إنتاج إلى جهازك. البذور مُصنَّعة فقط.
4. **الوكيل لا يرى ما لا يجب:** لا تُلصق `.env` أو مفاتيح في محادثة.
5. **سجلات:** لا تسجيل لكلمات المرور أو الرموز؛ راجع أي `console.log` قبل الدفع.
6. **قبل كل دفع:** `pnpm lint && pnpm typecheck && pnpm test` + `security` mode لتغييرات البيانات.

---

## ٩. قائمة تحقق الانطلاق (اطبعها)

- [ ] `node tooling/doctor.mjs` بلا ✘
- [ ] `pnpm install` ثم `db:generate` و`db:migrate` و`db:seed` ناجحة
- [ ] المهمة ٣ تفتح http://localhost:4000 وتظهر شاشة الدخول
- [ ] دخول الحساب التجريبي يعمل
- [ ] `Task: ٥ · تحقق كامل قبل الدفع` أخضر
- [ ] تمديدات VS Code مثبّتة، والأوضاع تظهر في Copilot Chat
- [ ] `Task: ٦ · بناء APK` ينتج ملفًا (أو سببه الموثّق: JDK/SDK)
- [ ] تشغيل `Android build` يدويًا من تبويب Actions أخضر
- [ ] `docs/android.md` و`docs/decisions.md` مقروءان من الفريق

---

## ١٠. استكشاف الأخطاء السريع

| العرض | السبب المحتمل | الحل |
| --- | --- | --- |
| `doctor` يقول Prisma Client لم يُولَّد | شبكة تمنع `binaries.prisma.sh` | `PRISMA_ENGINES_MIRROR` أو شغّل `db:generate` على CI |
| `Command "prepare:web" not found` | نُفِّذ من الجذر | `cd apps/mobile` أو `pnpm android:prepare` |
| `JAVA_HOME is not set` | JDK غير مثبّت/غير مضبوط | ثبّت JDK 21 وأعد فتح الطرفية |
| `SDK location not found` | لا `ANDROID_HOME` | افتح Android Studio مرة واحدة أو اضبط المتغيّر |
| اختبارات PostgreSQL متخطّاة | لا `TEST_DATABASE_URL` | أنشئ `rihal_test` ومرّر المتغيّرين |
| Copilot لا يتبع القواعد | الملف في فرع غير الفرع الافتراضي | انسخ التعليمات إلى `main` أو استخدم الوضع المناسب |
| MCP لا يعمل | `npx`/موافقة | استخدم `npx.cmd` على Windows ووافق على الخادم |
| `Your local changes … would be overwritten by checkout` | تعديلات محلية على ملفات موجودة في الفرع الهدف | `git stash push -u` ثم التبديل ثم `git stash pop` — التفصيل في §١١ |
| `Cannot find module …\tooling\doctor.mjs` | لسه على فرع قديم (الملف غير موجود فيه) | `git branch --show-current` — يجب أن يكون `dev-env` أو الفرع الجاهز |

---

## ١١. الانتقال إلى فرع البيئة بأمان (حل تعارض الـcheckout)

يظهر هذا الخطأ عندما تكون لديك تعديلات غير محفوظة على ملفات موجودة أيضًا في الفرع الهدف
(شائع: `.env.example`, `.vscode/settings.json`, `AGENTS.md`):

```
error: Your local changes to the following files would be overwritten by checkout
```

### التسلسل الآمن

```bash
cd ~/rihal
git status --short                       # ١) اعرف ما الذي تغيّر فعليًا

# ٢) احتفظ بنسخة من إعداداتك الشخصية خارج المستودع (إن أردت الرجوع إليها)
cp .vscode/settings.json ~/settings.personal.json 2>/dev/null || true

# ٣) خزّن التعديلات (بما فيها الملفات غير المتعقَّبة)
git stash push -u -m "wip-before-dev-env"

# ٤) بدّل إلى فرع البيئة
git switch -c dev-env origin/arena/0d97b4aa-rihal

# ٥) تحقق أن الملفات وصلت
ls tooling/doctor.mjs apps/mobile/package.json .vscode/tasks.json

# ٦) (اختياري) استعد تعديلاتك فوق الفرع الجديد — قد يحدث تعارض فادمجه يدويًا
git stash pop
```

### إن أردت البقاء على فرعك الحالي بدل التبديل

```bash
git stash push -u -m "wip"
git merge origin/arena/0d97b4aa-rihal
git stash pop
```

### تنظيف بقايا تثبيت سابقة في الجذر

إن ظهرت `@capacitor/*` أو `husky` ضمن تبعيات **الجذر** بدل `apps/mobile`:

```bash
corepack pnpm remove -D @capacitor/core @capacitor/cli @capacitor/android
```

ثم تأكد من الفرع الصحيح: `git branch --show-current` و`ls apps/mobile`.

> نصيحة: قبل أي تبديل فرع، اجعل شجرة العمل نظيفة (`git status` فارغ). هذا يمنع ٩٠٪ من أخطاء
> «الملف غير موجود» و«التعارض» التي تُهدر وقت الفريق.

---

**المراجع:** [`docs/android.md`](android.md) · [`docs/decisions.md`](decisions.md) · [`docs/progress.md`](progress.md) ·
`.github/copilot-instructions.md` · `.vscode/`
