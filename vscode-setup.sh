#!/usr/bin/env bash
command -v code >/dev/null || { echo "❌ أمر code غير موجود في PATH"; exit 1; }

ai=( GitHub.copilot GitHub.copilot-chat anthropic.claude-code )
byok=( saoudrizwan.claude-dev )

web=(
  dbaeumer.vscode-eslint
  ritwickdey.LiveServer
  formulahendry.auto-rename-tag
  bradlc.vscode-tailwindcss
  dsznajder.es7-react-js-snippets
  vue.volar
  svelte.svelte-vscode
  angular.ng-template
  prisma.prisma
  wix.vscode-import-cost
  ms-playwright.playwright
  vitest.explorer
)

api_db=(
  rangav.vscode-thunder-client
  humao.rest-client
  cweijan.vscode-database-client2
  mtxr.sqltools
)

install_group() {
  local -n arr=$1
  echo "📦 مجموعة: $1"
  for ext in "${arr[@]}"; do
    if code --install-extension "$ext" --force >/dev/null 2>&1; then
      echo "  ✅ $ext"
    else
      echo "  ⚠️  تخطّي: $ext"
    fi
  done
}

groups=("$@")
[ "${#groups[@]}" -eq 0 ] && groups=(ai)
for g in "${groups[@]}"; do install_group "$g"; done
echo "🎉 انتهى. أعد تشغيل VS Code."
