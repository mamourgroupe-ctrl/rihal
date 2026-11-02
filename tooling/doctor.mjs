#!/usr/bin/env node
/** فحص بيئة تطوير رحّال.
 *
 * الاستخدام:
 *   node tooling/doctor.mjs            # تقرير ملوّن
 *   node tooling/doctor.mjs --json     # تقرير آلي
 *   node tooling/doctor.mjs --strict   # يفشل عند أي عنصر ناقص (بما فيها الاختيارية)
 *
 * يعمل على Windows وmacOS وLinux بدون تبعيات خارجية.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const isWindows = process.platform === 'win32';
const args = new Set(process.argv.slice(2));
const jsonMode = args.has('--json');
const strict = args.has('--strict');

const C = {
  reset: '\u001b[0m',
  dim: '\u001b[2m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  cyan: '\u001b[36m',
  bold: '\u001b[1m',
};

/** يمنع ألوان ANSI في --json أو عند إعادة التوجيه. */
const color = (code, text) => (jsonMode || !process.stdout.isTTY ? text : `${code}${text}${C.reset}`);

const results = [];
const record = (group, name, status, detail, hint) =>
  results.push({ group, name, status, detail: detail ?? '', hint: hint ?? '' });

function run(command, commandArgs = [], options = {}) {
  try {
    return execFileSync(command, commandArgs, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 20_000,
      ...options,
    }).trim();
  } catch (error) {
    if (error.stdout) return String(error.stdout).trim();
    return null;
  }
}

function hasBinary(name) {
  if (isWindows) return run('where', [name]) !== null;
  return run('which', [name]) !== null;
}

function version(command, commandArgs) {
  const output = run(command, commandArgs);
  if (!output) return null;
  return output.split('\n')[0].trim();
}

function majorVersion(text) {
  const match = text && text.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function readEnvFile() {
  const file = join(root, '.env');
  if (!existsSync(file)) return {};
  const env = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

/* ----------------------------- Node & pnpm ----------------------------- */
record('الأساسيات', 'Node.js', 'ok', process.version, '');
if (majorVersion(process.version) < 22) {
  results[results.length - 1].status = 'fail';
  results[results.length - 1].hint =
    'رحّال يحتاج Node.js 22 أو أحدث — استخدم nvm أو winget install OpenJS.NodeJS.LTS';
}

const pnpmVersion = run('corepack', ['pnpm', '--version']);
if (pnpmVersion) record('الأساسيات', 'pnpm (corepack)', 'ok', `v${pnpmVersion}`, '');
else {
  record(
    'الأساسيات',
    'pnpm (corepack)',
    'fail',
    'غير متاح',
    'شغّل: corepack enable && corepack prepare pnpm@9.15.0 --activate',
  );
}

for (const [name, hint, optional] of [
  ['git', 'winget install Git.Git (أو brew install git)', false],
  ['gh', 'winget install GitHub.cli ثم gh auth login', true],
  ['docker', 'Docker Desktop — لازمة فقط لتشغيل قاعدة بيانات محلية معزولة', true],
]) {
  if (hasBinary(name)) {
    record('الأساسيات', name, 'ok', version(name, ['--version']) ?? 'متاح', '');
  } else {
    record('الأساسيات', name, optional ? 'warn' : 'fail', 'غير مثبّت', hint);
  }
}

/* ------------------------------- المستودع ------------------------------ */
const expected = [
  'apps/api/src/main.ts',
  'apps/api/public/index.html',
  'packages/database/prisma/schema.prisma',
  'apps/mobile/package.json',
  'apps/mobile/android/gradlew',
  '.vscode/settings.json',
];
const missing = expected.filter((path) => !existsSync(join(root, path)));
record(
  'المستودع',
  'ملفات أساسية',
  missing.length ? 'fail' : 'ok',
  missing.length ? `ناقص: ${missing.join(', ')}` : `${expected.length} ملفًا موجودًا`,
  missing.length
    ? 'أنت على فرع قديم؟ git fetch origin && git switch -c android-console origin/arena/0d97b4aa-rihal'
    : '',
);

record(
  'المستودع',
  'node_modules',
  existsSync(join(root, 'node_modules')) ? 'ok' : 'fail',
  existsSync(join(root, 'node_modules')) ? 'مثبّتة' : 'غير مثبّتة',
  'شغّل: corepack pnpm install',
);

const generatedClient = [
  'node_modules/.prisma/client/index.js',
  'packages/database/node_modules/.prisma/client/index.js',
].some((path) => existsSync(join(root, path)));
record(
  'المستودع',
  'Prisma Client',
  generatedClient ? 'ok' : 'warn',
  generatedClient ? 'مولَّد' : 'لم يُولَّد بعد',
  'شغّل: corepack pnpm db:generate (يحتاج وصولًا إلى binaries.prisma.sh أو PRISMA_ENGINES_MIRROR)',
);

const env = readEnvFile();
record(
  'المستودع',
  '.env',
  existsSync(join(root, '.env')) ? 'ok' : 'warn',
  existsSync(join(root, '.env')) ? 'موجود' : 'غير موجود (انسخه من .env.example)',
  'cp .env.example .env ثم عدّل DATABASE_URL وDIRECT_URL وAUTH_SECRET',
);

/* ------------------------------- أندرويد ------------------------------- */
const javaHome = process.env.JAVA_HOME;
const javaInfo =
  version('java', ['-version']) ??
  (javaHome ? run(join(javaHome, 'bin', isWindows ? 'java.exe' : 'java'), ['-version']) : null);
const javaMajor = javaInfo ? majorVersion(javaInfo) : null;
if (javaInfo && javaMajor) {
  const ok = javaMajor >= 21;
  record(
    'أندرويد',
    'JDK',
    ok ? 'ok' : 'fail',
    javaInfo,
    ok
      ? ''
      : 'Android Gradle Plugin يحتاج JDK 21 — winget install EclipseAdoptium.Temurin.21.JDK أو brew install --cask temurin@21',
  );
} else {
  record('أندرويد', 'JDK', 'fail', 'غير موجود', 'ثبّت JDK 21 واضبط JAVA_HOME');
}

const androidHome =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  (isWindows ? join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk') : '');
const sdkPresent = Boolean(androidHome) && existsSync(androidHome);
record(
  'أندرويد',
  'Android SDK',
  sdkPresent ? 'ok' : 'fail',
  sdkPresent ? androidHome : 'ANDROID_HOME غير مضبوط أو المسار غير موجود',
  sdkPresent
    ? ''
    : 'ثبّت Android Studio أو cmdline-tools واضبط ANDROID_HOME وPATH (platform-tools, cmdline-tools/latest/bin)',
);

if (sdkPresent) {
  const platformTools = join(androidHome, 'platform-tools', isWindows ? 'adb.exe' : 'adb');
  const adb = existsSync(platformTools) ? version(platformTools, ['version']) : null;
  record(
    'أندرويد',
    'adb',
    adb ? 'ok' : 'warn',
    adb ?? 'غير موجود',
    adb ? '' : 'من SDK Manager: Android SDK Platform-Tools',
  );
  const platforms = existsSync(join(androidHome, 'platforms'))
    ? run(
        isWindows ? 'cmd' : 'ls',
        isWindows ? ['/c', 'dir', '/b', join(androidHome, 'platforms')] : [join(androidHome, 'platforms')],
      )
    : null;
  record(
    'أندرويد',
    'Android platforms',
    platforms ? 'ok' : 'warn',
    platforms ? platforms.split(/\r?\n/).filter(Boolean).join(', ') : 'لم تُثبَّت منصات',
    'SDK Manager: Android 15 (API 35) وAndroid 16 (API 36)',
  );
}

const gradle = existsSync(join(root, 'apps/mobile/android', isWindows ? 'gradlew.bat' : 'gradlew'));
record(
  'أندرويد',
  'Gradle wrapper',
  gradle ? 'ok' : 'fail',
  gradle ? 'apps/mobile/android' : 'مفقود',
  gradle ? '' : 'المشروع يُولَّد بـ cap add android على الفرع الصحيح',
);

/* --------------------------------- iOS --------------------------------- */
if (process.platform === 'darwin') {
  const xcodebuild = version('xcodebuild', ['-version']);
  record(
    'iOS',
    'Xcode',
    xcodebuild ? 'ok' : 'fail',
    xcodebuild ?? 'غير مثبّت',
    'App Store: Xcode 16+ ثم xcode-select --install',
  );
  const pod = version('pod', ['--version']);
  record(
    'iOS',
    'CocoaPods',
    pod ? 'ok' : 'warn',
    pod ?? 'غير مثبّت',
    'sudo gem install cocoapods أو brew install cocoapods',
  );
} else {
  record(
    'iOS',
    'Xcode',
    'warn',
    `غير متاح على ${process.platform}`,
    'بناء iOS يتم عبر .github/workflows/ios.yml على macos-latest أو خدمة سحابية',
  );
}

/* ------------------------------ قاعدة البيانات -------------------------- */
const databaseUrl = process.env.DATABASE_URL || env.DATABASE_URL || '';
if (!databaseUrl) {
  record(
    'قاعدة البيانات',
    'DATABASE_URL',
    'fail',
    'غير معرّف',
    'أضفه إلى .env — مثال: postgresql://rihal_app@127.0.0.1:5432/rihal?schema=public',
  );
} else {
  const host =
    databaseUrl
      .replace(/^postgresql:\/\//, '')
      .split('@')[1]
      ?.split('/')[0] ?? '؟';
  record('قاعدة البيانات', 'DATABASE_URL', 'ok', `مضبوط (${host})`, '');
  const port = host.split(':')[1] ?? '5432';
  const tcp = run('node', [
    '-e',
    `const s=require('net').connect(${Number(port)},'${host.split(':')[0] || '127.0.0.1'}');s.on('connect',()=>{console.log('open');s.end()});s.on('error',e=>{console.log('closed');});setTimeout(()=>{console.log('closed');process.exit(0)},1500);`,
  ]);
  record(
    'قاعدة البيانات',
    'PostgreSQL',
    tcp === 'open' ? 'ok' : 'warn',
    tcp === 'open' ? 'المنفذ مفتوح' : 'لا استجابة',
    tcp === 'open'
      ? ''
      : 'شغّل PostgreSQL (Docker: docker run -p 5432:5432 -e POSTGRES_PASSWORD=… postgres:16)',
  );
}

/* ------------------------------- VS Code ------------------------------- */
const recommended = [
  '.vscode/settings.json',
  '.vscode/tasks.json',
  '.vscode/launch.json',
  '.vscode/extensions.json',
];
record(
  'VS Code',
  'إعدادات الفريق',
  recommended.every((path) => existsSync(join(root, path))) ? 'ok' : 'warn',
  recommended.filter((path) => existsSync(join(root, path))).length + '/4 ملفات',
  'في VS Code: Command Palette → Extensions: Show Recommended Extensions',
);

/* -------------------------------- التقرير ------------------------------- */
const failed = results.filter((r) => r.status === 'fail');
const warned = results.filter((r) => r.status === 'warn');
const relevant = strict ? [...failed, ...warned] : failed;

if (jsonMode) {
  console.log(JSON.stringify({ ok: failed.length === 0, results }, null, 2));
} else {
  const groups = [...new Set(results.map((r) => r.group))];
  const icon = { ok: color(C.green, '✔'), warn: color(C.yellow, '!'), fail: color(C.red, '✘') };
  console.log(
    `\n${color(C.bold, 'فحص بيئة رحّال')} ${color(C.dim, `— ${process.platform} ${process.arch}`)}\n`,
  );
  for (const group of groups) {
    console.log(color(C.cyan, `■ ${group}`));
    for (const item of results.filter((r) => r.group === group)) {
      console.log(`  ${icon[item.status]} ${item.name.padEnd(22)} ${color(C.dim, item.detail)}`);
      if (item.status !== 'ok' && item.hint) console.log(`      ${color(C.yellow, '↳ ' + item.hint)}`);
    }
    console.log('');
  }
  const summary = `${results.length - failed.length - warned.length}/${results.length} جاهز`;
  console.log(
    failed.length
      ? color(C.red, `${summary} — ${failed.length} عنصرًا حاجبًا، ${warned.length} تحذيرًا`)
      : color(C.green, `${summary} — لا عوائق${warned.length ? ` (${warned.length} تحذير)` : ''}`),
  );
  if (failed.length) console.log(color(C.dim, 'التفاصيل الكاملة: docs/dev-environment.md'));
  console.log('');
}

process.exit(relevant.length ? 1 : 0);
