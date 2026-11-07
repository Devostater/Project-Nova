# Build, sign and install Project Nova on the Quest 3 (flow from ChatGPT/Codex, 2026-11-07)
# Usage: powershell -File tools\build_install_quest.ps1 [-SkipBuild] [-Launch]
param([switch]$SkipBuild, [switch]$Launch)
$ErrorActionPreference = 'Stop'

$Sdk        = 'C:\Users\devos\AppData\Local\Android\Sdk'
$BuildTools = "$Sdk\build-tools\32.0.0"
$Adb        = "$Sdk\platform-tools\adb.exe"
$RepoRoot   = Split-Path -Parent $PSScriptRoot
$QuestBuild = Join-Path $RepoRoot 'android'
$Unsigned   = "$QuestBuild\app\build\outputs\apk\release\app-release-unsigned.apk"
$Signed     = "$QuestBuild\app\build\outputs\apk\release\project-nova-quest-v2.apk"
$Keystore   = 'C:\Users\devos\.android\debug.keystore'
$Package    = 'com.azi.projectnova'

if (-not (Test-Path $QuestBuild)) { throw "Bubblewrap project missing: $QuestBuild (ask ChatGPT to regenerate it)" }

node (Join-Path $PSScriptRoot 'sync_html.mjs')
if ($LASTEXITCODE) { throw 'HTML sync failed' }

if (-not $SkipBuild) {
  Push-Location $QuestBuild
  try { .\gradlew.bat assembleRelease; if ($LASTEXITCODE) { throw 'gradle build failed' } } finally { Pop-Location }
  if (Test-Path $Signed) { Remove-Item $Signed }
  & "$BuildTools\zipalign.exe" -f -p 4 $Unsigned $Signed
  & "$BuildTools\apksigner.bat" sign --ks $Keystore --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android $Signed
  & "$BuildTools\apksigner.bat" verify $Signed
}

$dev = (& $Adb devices | Select-String '\tdevice$' | Select-Object -First 1)
if (-not $dev) {
  Write-Warning 'APK built and signed, but no authorized Quest was found; skipping install.'
  Write-Host "Signed APK: $Signed"
  exit 0
}
$Device = ($dev.ToString() -split "`t")[0]

& $Adb -s $Device install -r $Signed
& $Adb -s $Device shell dumpsys package $Package | Select-String 'versionCode=|versionName=|lastUpdateTime'
if ($Launch) { & $Adb -s $Device shell am start -W -n "$Package/.LauncherActivity" }
Write-Host 'Installed. Open App Library > Unknown Sources > Project Nova.'
