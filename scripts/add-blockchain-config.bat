@echo off
REM Batch script to add blockchain config to backend/.env (Windows)
REM Usage: scripts\add-blockchain-config.bat

echo.
echo ========================================
echo Adding blockchain configuration...
echo ========================================
echo.

REM Check if PowerShell is available
powershell -Command "exit 0" >nul 2>&1
if errorlevel 1 (
    echo ERROR: PowerShell is not available!
    echo Please install PowerShell or run the script manually.
    pause
    exit /b 1
)

REM Run PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0add-blockchain-config.ps1"

if errorlevel 1 (
    echo.
    echo ERROR: Script failed!
    pause
    exit /b 1
)

echo.
echo Done!
pause




