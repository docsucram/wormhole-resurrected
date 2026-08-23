@echo off
title Wormhole Resurrected - LAN Server Launcher
cd /d "%~dp0"

echo ================================================================
echo        WORMHOLE RESURRECTED // LAN SERVER LAUNCHER              
echo ================================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [*] Node.js runtime detected. Starting high-performance server...
    node server.cjs
) else (
    echo [*] Node.js not detected. Starting native Windows zero-install server...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0lan_server.ps1"
)

if %ERRORLEVEL% NEQ 0 (
    echo [!] Server exited with an error.
    pause
)
