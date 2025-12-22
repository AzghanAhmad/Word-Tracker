@echo off
echo ========================================
echo Word Tracker Backend (C# .NET)
echo ========================================
echo.

REM Check if dotnet is available
where dotnet >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: .NET SDK not found!
    echo Please install .NET 8.0 SDK from https://dotnet.microsoft.com/download
    echo.
    pause
    exit /b 1
)

echo Checking .NET version...
dotnet --version
echo.

echo Restoring packages (if needed)...
dotnet restore
if %errorlevel% neq 0 (
    echo WARNING: Package restore failed, continuing anyway...
    echo.
)

echo.
echo Starting backend server...
echo Backend will be available at: http://localhost:8080
echo Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

dotnet run

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo Server stopped with error!
    echo ========================================
    echo.
    echo Common issues:
    echo 1. MySQL not running - start it from XAMPP Control Panel
    echo 2. Port 8080 already in use - close other applications
    echo 3. Database connection failed - check MySQL credentials
    echo.
    pause
)
