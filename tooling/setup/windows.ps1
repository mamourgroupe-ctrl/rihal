<#
.SYNOPSIS
  تهيئة بيئة تطوير رحّال على Windows 11 (أندرويد + الويب + الأدوات المساندة).

.DESCRIPTION
  يثبّت عبر winget: Git, Node.js LTS, JDK 21 (Temurin), Android command-line tools,
  VS Code, GitHub CLI, Docker Desktop (اختياري)، ويضبط متغيّرات البيئة ويُفعّل Corepack.
  السكربت آمن عند إعادة التشغيل: يتجاوز ما هو مثبّت.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tooling/setup/windows.ps1
  powershell -ExecutionPolicy Bypass -File tooling/setup/windows.ps1 -SkipDocker
#>
param(
  [switch]$SkipDocker,
  [switch]$SkipAndroidStudio
)

$ErrorActionPreference = 'Stop'
function Write-Step($message) { Write-Host "`n== $message" -ForegroundColor Cyan }
function Write-Ok($message) { Write-Host "   ✓ $message" -ForegroundColor Green }
function Write-Warn2($message) { Write-Host "   ! $message" -ForegroundColor Yellow }

function Test-Command($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }

function Install-WingetPackage($id, $label) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "   → $label ($id)"
    winget install --id $id --exact --accept-source-agreements --accept-package-agreements --silent 2>&1 |
      Select-Object -Last 1 | ForEach-Object { Write-Host "     $_" }
  } else {
    Write-Warn2 "winget غير متاح — ثبّت $label يدويًا ($id)"
  }
}

Write-Step 'فحص winget'
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw 'winget مطلوب. حدّث "App Installer" من Microsoft Store ثم أعد التشغيل.'
}
Write-Ok 'winget متاح'

Write-Step 'تثبيت الأدوات الأساسية'
if (Test-Command git) { Write-Ok 'Git مثبّت' } else { Install-WingetPackage 'Git.Git' 'Git' }
if (Test-Command node) { Write-Ok "Node $(node -v) مثبّت" } else { Install-WingetPackage 'OpenJS.NodeJS.LTS' 'Node.js LTS' }
Install-WingetPackage 'EclipseAdoptium.Temurin.21.JDK' 'JDK 21'
Install-WingetPackage 'Microsoft.VisualStudioCode' 'VS Code'
Install-WingetPackage 'GitHub.cli' 'GitHub CLI'
if (-not $SkipAndroidStudio) { Install-WingetPackage 'Google.AndroidStudio' 'Android Studio (SDK + Emulator)' }
if (-not $SkipDocker) { Install-WingetPackage 'Docker.DockerDesktop' 'Docker Desktop' }

Write-Step 'ضبط متغيّرات البيئة'
[Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Eclipse Adoptium\jdk-21', 'User')
$androidHome = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (-not (Test-Path $androidHome)) { New-Item -ItemType Directory -Path $androidHome -Force | Out-Null }
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $androidHome, 'User')
[Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', $androidHome, 'User')

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
foreach ($entry in @("$androidHome\platform-tools", "$androidHome\cmdline-tools\latest\bin", 'C:\Program Files\Eclipse Adoptium\jdk-21\bin')) {
  if ($userPath -notlike "*$entry*") { $userPath = "$userPath;$entry" }
}
[Environment]::SetEnvironmentVariable('Path', $userPath, 'User')
Write-Ok "JAVA_HOME وANDROID_HOME مضبوطان ($androidHome)"

Write-Step 'تثبيت مكونات Android SDK بدون واجهة'
$sdkManager = Join-Path $androidHome 'cmdline-tools\latest\bin\sdkmanager.bat'
if (Test-Path $sdkManager) {
  & $sdkManager 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' 2>&1 | Select-Object -Last 3
  Write-Ok 'platform-tools وAndroid 36 مثبّتان'
} else {
  Write-Warn2 'sdkmanager غير موجود — افتح Android Studio مرة واحدة واسمح بتثبيت SDK، ثم أعد تشغيل هذا السكربت'
}

Write-Step 'تفعيل Corepack وpnpm'
corepack enable | Out-Null
corepack prepare pnpm@9.15.0 --activate | Out-Null
Write-Ok "pnpm $(corepack pnpm --version)"

Write-Step 'الخطوات التالية'
Write-Host @'
   1. أغلق الطرفية وافتحها من جديد (لتحديث PATH).
   2. cd rihal
   3. corepack pnpm install
   4. copy .env.example .env   ثم عدّل الاتصال بقاعدة البيانات
   5. corepack pnpm db:generate ; corepack pnpm db:migrate ; corepack pnpm db:seed
   6. node tooling/doctor.mjs      (يجب أن يصبح كل شيء ✔)
   7. code .                        (VS Code سيقترح التمديدات تلقائيًا)
'@ -ForegroundColor Gray
