@echo off
setlocal
cd /d "%~dp0"
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js 20 or later.
  pause
  exit /b 1
)
if not exist "node_modules\.bin\concurrently.cmd" (
  call npm.cmd install
  if errorlevel 1 goto failed
)
if not exist "server\node_modules\express\package.json" (
  call npm.cmd install --prefix server
  if errorlevel 1 goto failed
)
if not exist "client\node_modules\.bin\vite.cmd" (
  call npm.cmd install --prefix client
  if errorlevel 1 goto failed
)
echo RETRO GAMES - http://localhost:5173
echo Server and frontend run together. Press Ctrl+C to stop both.
call npm.cmd run dev
if errorlevel 1 goto failed
exit /b 0

:failed
echo Startup failed. Check the error above.
pause
exit /b 1
