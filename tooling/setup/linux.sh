#!/usr/bin/env bash
# تهيئة بيئة تطوير رحّال على Linux (أوبنتو/دبيان).
#
#   sudo bash tooling/setup/linux.sh
#
# ملاحظة: بناء iOS غير ممكن على Linux — استخدم .github/workflows/ios.yml.
set -euo pipefail

log() { printf '\n\033[36m== %s\033[0m\n' "$1"; }
ok() { printf '   \033[32m✓\033[0m %s\n' "$1"; }

if [ "$(id -u)" -ne 0 ]; then
  echo 'شغّل السكربت بصلاحيات root: sudo bash tooling/setup/linux.sh' >&2
  exit 1
fi

log 'تحديث الحزم'
apt-get update -qq
apt-get install -y -qq curl git unzip jq build-essential ca-certificates gnupg lsb-release >/dev/null
ok 'حزم أساسية'

log 'تثبيت Node.js 22'
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
ok "Node $(node -v)"

log 'تثبيت JDK 21'
apt-get install -y -qq openjdk-21-jdk-headless >/dev/null
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-amd64}"
ok "JAVA_HOME=$JAVA_HOME"

log 'تثبيت Android command-line tools'
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  curl -fsSL -o /tmp/cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  unzip -q /tmp/cmdline-tools.zip -d /tmp/cmdline-tools-unzip
  mv /tmp/cmdline-tools-unzip/cmdline-tools "$ANDROID_HOME/cmdline-tools/latest"
  rm -rf /tmp/cmdline-tools.zip /tmp/cmdline-tools-unzip
fi
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null 2>&1 || true
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' >/dev/null
ok "Android SDK في $ANDROID_HOME"

log 'تثبيت GitHub CLI'
if ! command -v gh >/dev/null 2>&1; then
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg > /usr/share/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    > /etc/apt/sources.list.d/github-cli.list
  apt-get update -qq && apt-get install -y -qq gh >/dev/null
fi
ok "gh $(gh --version | head -n1 | awk '{print $3}')"

log 'تفعيل Corepack'
corepack enable >/dev/null
corepack prepare pnpm@9.15.0 --activate >/dev/null
ok "pnpm $(corepack pnpm --version)"

cat <<'NEXT'

   أضف إلى ~/.bashrc:
     export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
     export ANDROID_HOME=/opt/android-sdk
     export ANDROID_SDK_ROOT=$ANDROID_HOME
     export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$JAVA_HOME/bin:$PATH"

   ثم:
     corepack pnpm install && node tooling/doctor.mjs
NEXT
