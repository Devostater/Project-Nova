@echo off
setlocal enabledelayedexpansion
title Project Nova - Live Quest Test Runner
cd /d "%~dp0.."

echo ====================================================================
echo   PROJECT NOVA - LIVE QUEST TEST RUNNER
echo ====================================================================
echo.

rem 1. Sync generated HTML files
where node >nul 2>nul
if %errorlevel% equ 0 (
  echo [*] Syncing standalone.html to public/standalone.html and index.html...
  node tools\sync_html.mjs
  if %errorlevel% neq 0 (
    echo [ERROR] HTML sync failed. Fix errors and re-run.
    pause
    exit /b 1
  )
) else (
  echo [!] Node.js not found in PATH; skipping HTML sync check.
)

rem 2. Find Python
set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY (
  echo [ERROR] Python not found. Please install Python to run the local server.
  pause
  exit /b 1
)

rem 3. Free port 8011 if previously held
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r ":8011.*LISTENING"') do (
  echo [*] Clearing old process on port 8011 (PID: %%a)...
  taskkill /f /pid %%a >nul 2>nul
)

rem 4. Find ADB
set "ADB="
where adb >nul 2>nul && set "ADB=adb"
if not defined ADB if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
if not defined ADB if exist "%ProgramFiles%\Meta Quest Developer Hub\resources\bin\adb.exe" set "ADB=%ProgramFiles%\Meta Quest Developer Hub\resources\bin\adb.exe"
if not defined ADB if exist "%LOCALAPPDATA%\Programs\SideQuest\resources\app.asar.unpacked\build\platform-tools\adb.exe" set "ADB=%LOCALAPPDATA%\Programs\SideQuest\resources\app.asar.unpacked\build\platform-tools\adb.exe"
if not defined ADB if exist "%~dp0platform-tools\adb.exe" set "ADB=%~dp0platform-tools\adb.exe"

set "QUEST_ATTACHED=0"
if defined ADB (
  "%ADB%" start-server >nul 2>nul
  for /f "tokens=1" %%d in ('"%ADB%" devices ^| findstr /r /c:"	device$"') do (
    set "QUEST_ATTACHED=1"
  )
)

rem 5. Forward port & launch Quest browser if headset is plugged in
set "SYNC_ID=%RANDOM%%RANDOM%"
if "!QUEST_ATTACHED!"=="1" (
  echo [*] Meta Quest detected over USB.
  echo [*] Setting up USB port reverse: Quest 8011 -^> PC 8011...
  "%ADB%" reverse tcp:8011 tcp:8011
  echo [*] Waking Quest display...
  "%ADB%" shell input keyevent KEYCODE_WAKEUP >nul 2>nul
  echo [*] Launching live test build in Quest Browser...
  "%ADB%" shell am start -a android.intent.action.VIEW -d "http://localhost:8011/standalone.html?sync=!SYNC_ID!" com.oculus.browser >nul 2>nul
  echo [*] Headset opened to: http://localhost:8011/standalone.html?sync=!SYNC_ID!
) else (
  echo [i] No authorized Quest found via ADB.
  echo     - If using USB: connect cable and allow USB debugging in headset.
  echo     - If using Wi-Fi: open http://^<YOUR-PC-IP^>:8011/standalone.html in Quest Browser.
)

echo.
echo ====================================================================
echo   SERVER RUNNING: http://localhost:8011/standalone.html
echo   Serving directory: public\
echo   (Service Worker cache disabled on localhost for 100%% fresh testing)
echo ====================================================================
echo   Keep this window open while testing.
echo   Press Ctrl+C to stop the server when done.
echo ====================================================================
echo.

%PY% -m http.server 8011 --directory public
