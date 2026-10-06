@echo off
rem Double-click to build the Windows app on this PC. Needs Node.js (free, one-time): https://nodejs.org
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Opening the download page: choose the LTS installer, then double-click this file again.
  start "" https://nodejs.org
  pause
  exit /b 1
)
echo Installing build tools (first time takes a few minutes)...
call npm install
if errorlevel 1 goto :fail
call npm test
if errorlevel 1 goto :fail
call npm run dist:win
if errorlevel 1 goto :fail
echo.
echo Done. The installers are in the dist folder.
start "" dist
pause
exit /b 0
:fail
echo Something went wrong. Scroll up to read the message.
pause
exit /b 1
