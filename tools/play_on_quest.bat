@echo off
title Project Nova - play on Quest over USB
cd /d "%~dp0"
echo.
echo  PROJECT NOVA - USB play
echo  1. Quest plugged in by USB, developer mode on, "Allow USB debugging" accepted in the headset.
echo.

rem --- find adb (PATH, Meta Quest Developer Hub, SideQuest, Android platform-tools)
set "ADB="
where adb >nul 2>nul && set "ADB=adb"
if not defined ADB if exist "%ProgramFiles%\Meta Quest Developer Hub\resources\bin\adb.exe" set "ADB=%ProgramFiles%\Meta Quest Developer Hub\resources\bin\adb.exe"
if not defined ADB if exist "%LOCALAPPDATA%\Programs\SideQuest\resources\app.asar.unpacked\build\platform-tools\adb.exe" set "ADB=%LOCALAPPDATA%\Programs\SideQuest\resources\app.asar.unpacked\build\platform-tools\adb.exe"
if not defined ADB if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
if not defined ADB if exist "%~dp0platform-tools\adb.exe" set "ADB=%~dp0platform-tools\adb.exe"
if not defined ADB (
  echo  Could not find adb.exe.
  echo  Download "SDK Platform-Tools for Windows" from developer.android.com/tools/releases/platform-tools
  echo  and unzip it so this folder contains platform-tools\adb.exe, then run this again.
  pause & exit /b 1
)

"%ADB%" start-server >nul 2>nul
"%ADB%" devices | findstr /r /c:"device$" >nul
if errorlevel 1 (
  echo  No Quest found. Check the cable, developer mode, and accept the USB debugging prompt inside the headset.
  "%ADB%" devices
  pause & exit /b 1
)

echo  Quest found. Linking the headset's localhost:8000 to this PC...
"%ADB%" reverse tcp:8000 tcp:8000

echo  Opening the game in the Quest browser...
"%ADB%" shell am start -a android.intent.action.VIEW -d "http://localhost:8000/standalone.html" com.oculus.browser >nul 2>nul

echo  Starting the game server (keep this window open while you play, close it to stop).
echo.
where python >nul 2>nul && (python -m http.server 8000 --directory "%~dp0.." & goto :eof)
where py >nul 2>nul && (py -m http.server 8000 --directory "%~dp0.." & goto :eof)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1" -Root "%~dp0.." -Port 8000
