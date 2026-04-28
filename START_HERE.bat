@echo off
REM ========================================================
REM WhatsApp Broadcaster - Click to Run!
REM This is the main launcher - just double-click this file
REM ========================================================

setlocal enabledelayedexpansion

cls
echo.
echo ============================================================
echo          WhatsApp Rotation Broadcast System
echo ============================================================
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not installed
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/ (LTS version)
    echo.
    echo After installing Node.js, run this file again.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set "NODEVERSION=%%i"
echo [OK] Node.js version: %NODEVERSION%
echo.

echo [Info] Starting WhatsApp Broadcaster...
echo [Info] First startup will download Chromium (takes 5-10 minutes)
echo [Info] Please wait for the Chrome browser window to appear
echo.
echo Press Ctrl+C to stop the application
echo ============================================================
echo.

REM Get the directory where this file is located
set "APPDIR=%~dp0"

REM Run the application
node "%APPDIR%rotation-broadcast-app.js"

REM Show exit message
echo.
echo Application closed.
pause
