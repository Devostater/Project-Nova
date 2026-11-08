@echo off
cd /d "%~dp0.."
where py >nul 2>nul && (
  py -3 tools\test_runner.py
  goto :done
)
where python >nul 2>nul && (
  python tools\test_runner.py
  goto :done
)
echo [ERROR] Python not found. Please install Python from python.org to run the local server.
pause
:done
