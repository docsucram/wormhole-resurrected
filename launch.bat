@echo off
title Wormhole: Resurrected Launcher
color 0B

echo =======================================================
echo          WORMHOLE: RESURRECTED - VECTOR ARCADE
echo =======================================================
echo.
echo [1/3] Checking environment...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org to play.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [2/3] Installing dependencies...
    call npm install
) else (
    echo [2/3] Dependencies found.
)

echo.
echo [3/3] Starting local game server at http://localhost:3000 ...
echo.
echo =======================================================
echo  Server active! Opening game in your default browser...
echo  (Press Ctrl+C in this terminal window to stop server)
echo =======================================================
echo.

start http://localhost:3000
call npx vite --host --port 3000
