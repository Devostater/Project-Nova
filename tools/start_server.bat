@echo off
title Project Nova - local test server
rem Serves THIS repo's latest game (public/) on a dedicated port so an old Nova server cannot answer instead.
rem Normal play doesn't need this: the live game is https://devostater.github.io/Project-Nova/standalone.html
cd /d "%~dp0.."

where node >nul 2>nul && node tools\sync_html.mjs

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY (
  echo Python not found. Install it from python.org, or just play the live game:
  echo   https://devostater.github.io/Project-Nova/standalone.html
  pause & exit /b 1
)

echo.
echo  PROJECT NOVA local server: http://localhost:8765/standalone.html
echo  Keep this window open while testing. Close it to stop the server.
echo.
start "" "http://localhost:8765/standalone.html?fresh=%RANDOM%%RANDOM%"
%PY% -m http.server 8765 --directory public
