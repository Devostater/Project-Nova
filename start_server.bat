@echo off
setlocal
cd /d "%~dp0"
title NOVA server

rem ---- find a working Python (system first, then the one bundled with Blender) ----
set "PY="
where py >nul 2>&1 && py -3 -c "import ssl" >nul 2>&1 && set "PY=py -3"
if not defined PY where python >nul 2>&1 && python -c "import ssl" >nul 2>&1 && set "PY=python"
if not defined PY (
  for /d %%D in ("C:\Program Files\Blender Foundation\Blender*") do (
    for /d %%V in ("%%D\*") do (
      if exist "%%V\python\bin\python.exe" set PY="%%V\python\bin\python.exe"
    )
  )
)
if not defined PY (
  echo Could not find Python. Install it from python.org, or install Blender.
  pause & exit /b 1
)

rem ---- one-time certificate ----
if not exist cert.pem (
  echo Creating HTTPS certificate ^(one time^)...
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0make_cert.ps1"
  if not exist cert.pem ( echo Certificate creation failed. & pause & exit /b 1 )
)

rem ---- let the Quest through the Windows firewall (needs admin; harmless if it fails) ----
netsh advfirewall firewall show rule name="NOVA 8443" >nul 2>&1
if errorlevel 1 (
  netsh advfirewall firewall add rule name="NOVA 8443" dir=in action=allow protocol=TCP localport=8443 profile=private >nul 2>&1
  if errorlevel 1 echo NOTE: if the Quest cannot connect, right-click this file and Run as administrator once.
)

rem ---- open Chrome on this PC once the server is up (separate profile so the local certificate warning is skipped) ----
set "CH="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CH if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CH if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CH=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if defined CH (
  start "" /min cmd /c "timeout /t 4 /nobreak >nul & start "" "%CH%" --ignore-certificate-errors --user-data-dir="%TEMP%\nova_chrome" --new-window https://localhost:8443/standalone.html"
) else (
  start "" /min cmd /c "timeout /t 4 /nobreak >nul & start https://localhost:8443/standalone.html"
)

%PY% serve_nova.py
pause
