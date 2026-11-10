@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install Node.js 22.5 or newer, then run this file again.
  pause
  exit /b 1
)

if not exist ".env" (
  echo The local environment file .env is missing.
  echo Copy .env.example to .env and set ADMIN_PASSWORD and SESSION_SECRET before starting.
  pause
  exit /b 1
)

if not exist "node_modules\express\package.json" (
  where pnpm >nul 2>&1
  if not errorlevel 1 (
    echo Installing website dependencies with pnpm...
    call pnpm install
  ) else (
    echo Installing website dependencies with npm...
    call npm install
  )
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3000'"
where pnpm >nul 2>&1
if not errorlevel 1 (
  call pnpm start
) else (
  call npm start
)

if errorlevel 1 pause
endlocal
