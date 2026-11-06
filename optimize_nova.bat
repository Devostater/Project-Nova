@echo off
rem Finds Blender, then optimizes every GLB in this folder into .\models
setlocal enabledelayedexpansion
set BL=
for /d %%D in ("C:\Program Files\Blender Foundation\Blender*") do if exist "%%D\blender.exe" set BL=%%D\blender.exe
if "%BL%"=="" for /d %%D in ("%ProgramFiles(x86)%\Steam\steamapps\common\Blender") do if exist "%%D\blender.exe" set BL=%%D\blender.exe
if "%BL%"=="" (
  echo Blender not found. Edit this file and set BL to your blender.exe path.
  pause
  exit /b 1
)
echo Using %BL%
"%BL%" -b -P "%~dp0optimize_nova.py" -- "%~dp0." "%~dp0models" > "%~dp0optimize_log.txt" 2>&1
echo Done. See optimize_log.txt and the models folder.
pause
