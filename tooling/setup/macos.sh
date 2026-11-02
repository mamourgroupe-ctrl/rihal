#!/usr/bin/env bash
# تهيئة بيئة تطوير رحّال على macOS (iOS + أندرويد + الويب).
#
#   bash tooling/setup/macos.sh
#   SKIP_IOS=1 bash tooling/setup/macos.sh     # بدون Xcode/CocoaPods
#
# آمن عند إعادة التشغيل: Homebrew يتجاوز المثبّت مسبقًا.
set -euo pipefail

log() { printf '\n\033[36m== %s\033[0m\n' "$1"; }
ok() { printf '   \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '   \033[33m!\033[0m %s\n' "$1"; }

log 'فحص Homebrew'
if ! command -v brew >/dev/null 2>&1; then
  warn 'Homebrew غير مثبّت — سيُثبَّت الآن'
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
ok "Homebrew $(brew --version | head -n1)"

log 'تثبيت الأدوات'
brew install git node@22 gh jq watchman cocoapods 2>/dev/null || brew upgrade git node@22 gh jq watchman cocoapods 2>/dev/null || true
ok 'git, node@22, gh, jq, watchman, cocoapods'

log 'تثبيت JDK 21'
brew install --cask temurin@21 2>/dev/null || warn 'تثبيت Temurin 21 يحتاج تأكيدًا يدويًا'
if [ -d "/Library/Java/JavaVirtualMachines/temurin-21.jdk" ]; then
  export JAVA_HOME="/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home"
  ok "JAVA_HOME=$JAVA_HOME"
fi

log 'تثبيت Android SDK (cmdline-tools)'
if [ ! -d "$HOME/Library/Android/sdk" ]; then
  brew install --cask android-commandlinetools 2>/dev/null || warn 'ثبّت Android Studio أو cmdline-tools يدويًا'
fi
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
if [ -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
  yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null 2>&1 || true
  "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' >/dev/null || true
  ok 'platform-tools + Android 36'
else
  warn "sdkmanager غير موجود في $ANDROID_HOME"
fi

if [ "${SKIP_IOS:-0}" != "1" ]; then
  log 'فحص Xcode (لازم لبناء iOS)'
  if xcodebuild -version >/dev/null 2>&1; then
    ok "$(xcodebuild -version | head -n1)"
  else
    warn 'Xcode غير مثبّت — ثبّته من App Store ثم: sudo xcode-select -s /Applications/Xcode.app && sudo xcodebuild -license accept'
  fi
fi

log 'تفعيل Corepack'
corepack enable >/dev/null 2>&1 || true
corepack prepare pnpm@9.15.0 --activate >/dev/null
ok "pnpm $(corepack pnpm --version)"

cat <<'NEXT'

   الخطوات التالية:
     cd rihal
     corepack pnpm install
     cp .env.example .env        # ثم عدّل DATABASE_URL / DIRECT_URL / AUTH_SECRET
     corepack pnpm db:generate && corepack pnpm db:migrate && corepack pnpm db:seed
     node tooling/doctor.mjs
     code .

   أضف إلى ~/.zshrc:
     export JAVA_HOME="/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home"
     export ANDROID_HOME="$HOME/Library/Android/sdk"
     export PATH="$ANDROID_HOME/platform-tools:$JAVA_HOME/bin:$PATH"
NEXT
