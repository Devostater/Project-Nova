@echo off
setlocal EnableDelayedExpansion
title Project Nova - Update and Play
color 0B
rem One-click launcher: finds the repo, pulls the latest main, shows the build, then starts the local server.
rem Safe to copy to the Desktop: it looks for the repo next to itself first, then in Documents\GitHub.

set "REPO=%~dp0"
if not exist "%REPO%tools\test_runner.py" set "REPO=%USERPROFILE%\Documents\GitHub\Project-Nova\"
if not exist "%REPO%tools\test_runner.py" set "REPO=%USERPROFILE%\OneDrive\Documents\GitHub\Project-Nova\"
if not exist "%REPO%tools\test_runner.py" (
  echo [ERROR] Could not find the Project-Nova folder.
  echo Put this file inside the Project-Nova folder, or edit REPO at the top of this file.
  pause & exit /b 1
)
cd /d "%REPO%"
echo Project folder: %CD%
echo.

rem --- find git: GitHub Desktop's own copy first, then any git on PATH ---
set "GIT="
for /d %%D in ("%LOCALAPPDATA%\GitHubDesktop\app-*") do if exist "%%D\resources\app\git\cmd\git.exe" set "GIT=%%D\resources\app\git\cmd\git.exe"
if not defined GIT where git >nul 2>nul && set "GIT=git"

if defined GIT (
  echo [1/3] Getting the latest version from GitHub...
  "%GIT%" fetch origin main
  for /f %%B in ('"%GIT%" rev-parse --abbrev-ref HEAD') do set "BRANCH=%%B"
  if /i not "!BRANCH!"=="main" (
    echo   You are on branch "!BRANCH!", switching to main...
    "%GIT%" checkout main
  )
  "%GIT%" pull --ff-only origin main
  if errorlevel 1 (
    echo.
    echo   [!] Could not update automatically: you probably have local changes.
    echo       Open GitHub Desktop, commit or discard them, then run this again.
    echo       Starting the version you already have...
  )
  echo.
  for /f "delims=" %%C in ('"%GIT%" log -1 --format^="%%h  %%cs  %%s"') do echo   Now on: %%C
) else (
  echo [!] Git not found. Install GitHub Desktop, or pull in GitHub Desktop before playing.
)
echo.
echo [2/3] Check the main menu: it shows ALPHA x.x, the code name and "build xxxxxxx".
echo       That build code should match the one above.
echo.
echo [3/3] Starting the game server...
call tools\start_server.bat
