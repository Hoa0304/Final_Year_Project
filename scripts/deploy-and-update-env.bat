@echo off
REM Batch script to deploy contracts and update .env (Windows)
REM Usage: scripts\deploy-and-update-env.bat

echo.
echo ========================================
echo Deploying HMall Blockchain Contracts...
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
powershell -ExecutionPolicy Bypass -File "%~dp0deploy-and-update-env.ps1"

if errorlevel 1 (
    echo.
    echo ERROR: Script failed!
    pause
    exit /b 1
)

echo.
echo Done!
pause





