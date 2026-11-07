
@echo off
rem Build a signed Meta Quest PWA APK. See OFFLINE_PLAY.md.
rem Usage: tools\make_quest_apk.bat https://your-host.example
setlocal
if "%~1"=="" (
  echo Usage: %~nx0 https://your-host.example
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0make_quest_apk.ps1" -SiteUrl "%~1"
exit /b %ERRORLEVEL%

