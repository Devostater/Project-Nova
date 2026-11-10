@echo off
TITLE Project Nova - Dev Server
color 0A

echo ==========================================
echo    Starting Project Nova (WebXR / Three.js)
echo ==========================================
echo.

:: Navigate to the directory where this script is located (just in case)
cd /d "%~dp0"

echo [1/2] Checking node modules and starting Vite/Node dev server...
echo.

:: Runs your npm dev script (change 'dev' if your script is named something else in package.json)
npm run dev

pause