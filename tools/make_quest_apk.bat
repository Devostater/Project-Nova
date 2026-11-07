@echo off
rem Build a sideloadable Quest APK that wraps the hosted Project Nova web app (see OFFLINE_PLAY.md).
rem Usage: tools\make_quest_apk.bat https://your-host.pages.dev
setlocal
if "%~1"=="" (echo Usage: %~nx0 https://your-host/  ^(the address where public/ is hosted^) & exit /b 1)
set URL=%~1
if not "%URL:~-1%"=="/" set URL=%URL%/
if "%ANDROID_HOME%"=="" (echo Set ANDROID_HOME to your Android SDK folder first. & exit /b 1)
where ovr-platform-util >nul 2>nul || (echo ovr-platform-util not found. Install the Meta Quest Platform Utility and add it to PATH. & exit /b 1)
cd /d "%~dp0.."
powershell -NoProfile -Command "$m = Get-Content public\manifest.webmanifest -Raw | ConvertFrom-Json; $m.start_url = %URL%standalone.html; $m.scope = %URL%; $m | Add-Member -NotePropertyName ovr_package_name -NotePropertyValue com.azi.projectnova -Force; $m | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 tools\quest_manifest.json"
ovr-platform-util create-pwa -o ProjectNova.apk --android-sdk "%ANDROID_HOME%" --manifest-content-file tools\quest_manifest.json
if errorlevel 1 (echo APK build failed. Check the messages above. & exit /b 1)
echo Built ProjectNova.apk  -  sideload with:  adb install -r ProjectNova.apk
