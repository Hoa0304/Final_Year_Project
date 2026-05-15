@echo off
REM Batch script to update backend/.env with contract addresses (Windows)
REM Usage: scripts\update-env-with-addresses.bat

echo.
echo ========================================
echo Updating backend/.env with contract addresses...
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
powershell -ExecutionPolicy Bypass -File "%~dp0update-env-with-addresses.ps1"

if errorlevel 1 (
    echo.
    echo ERROR: Script failed!
    pause
    exit /b 1
)

echo.
echo Done!
pause




