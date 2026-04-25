@echo off
setlocal enabledelayedexpansion
title CYRI Agent — Build Tool

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║       CYRI Agent — Build Script          ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── Check Node.js ──────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo  [ERROR] Node.js is not installed or not in PATH.
  echo          Download it from: https://nodejs.org
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js found: %NODE_VER%

:: ── Install pkg globally if missing ───────────────────────────────────────
where pkg >nul 2>&1
if %errorlevel% neq 0 (
  echo  [INFO] pkg not found. Installing globally...
  call npm install -g pkg
  if %errorlevel% neq 0 (
    echo  [ERROR] Failed to install pkg. Check your npm/internet connection.
    pause
    exit /b 1
  )
  echo  [OK] pkg installed.
) else (
  echo  [OK] pkg already installed.
)

:: ── Install project dependencies ───────────────────────────────────────────
echo.
echo  [INFO] Installing project dependencies...
call npm install systeminformation axios
if %errorlevel% neq 0 (
  echo  [ERROR] npm install failed.
  pause
  exit /b 1
)
echo  [OK] Dependencies ready.

:: ── Create output folder ───────────────────────────────────────────────────
if not exist "dist-agent" mkdir dist-agent
echo  [OK] Output folder: dist-agent\

:: ── Build ──────────────────────────────────────────────────────────────────
echo.
echo  [INFO] Building CYRI-Agent.exe (this may take 1-2 minutes)...
echo         Bundling Node.js runtime + agent + dependencies...
echo.

call pkg agent-cjs.js --targets node18-win-x64 --output dist-agent\CYRI-Agent.exe

if %errorlevel% neq 0 (
  echo.
  echo  [ERROR] Build failed. See error above.
  echo  [TIP]   Make sure agent-cjs.js exists and has no syntax errors.
  echo          Run: node agent-cjs.js   to test before building.
  pause
  exit /b 1
)

:: ── Done ───────────────────────────────────────────────────────────────────
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   ✅ Build Successful!                   ║
echo  ║                                          ║
echo  ║   Output: dist-agent\CYRI-Agent.exe      ║
echo  ║                                          ║
echo  ║   You can now:                           ║
echo  ║   • Test it by double-clicking the exe   ║
echo  ║   • Share it with users for download     ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── Show file size ─────────────────────────────────────────────────────────
for %%F in (dist-agent\CYRI-Agent.exe) do (
  set /a SIZE_MB=%%~zF / 1048576
  echo  File size: !SIZE_MB! MB
)

echo.
pause
endlocal
