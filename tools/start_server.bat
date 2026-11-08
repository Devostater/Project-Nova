@echo off
title Project Nova - Test Runner
cd /d "%~dp0.."

where py >nul 2>nul && (
  py -3 tools\test_runner.py
  exit /b 0
)
where python >nul 2>nul && (
  python tools\test_runner.py
  exit /b 0
)
echo [ERROR] Python not found. Please install Python from python.org to run the local server.
pause
