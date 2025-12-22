@echo off
REM Run script for Word Tracker Backend with XAMPP MySQL

echo ========================================
echo Word Tracker Backend Server
echo ========================================
echo.

REM Check if server.exe exists
if not exist server.exe (
    echo ERROR: server.exe not found!
    echo Please run build.bat first to compile the backend.
    echo.
    pause
    exit /b 1
)

REM Set default database connection parameters for XAMPP
REM Override these by setting environment variables before running this script
if not defined DB_HOST set DB_HOST=localhost
if not defined DB_PORT set DB_PORT=3306
if not defined DB_USER set DB_USER=root
if not defined DB_PASSWORD set DB_PASSWORD=
if not defined DB_NAME set DB_NAME=word_tracker

echo Database Configuration:
echo   Host: %DB_HOST%
echo   Port: %DB_PORT%
echo   User: %DB_USER%
echo   Database: %DB_NAME%
echo.
echo Starting server on http://localhost:8080
echo Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

REM Run the server
server.exe

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo Server stopped with error!
    echo ========================================
    echo.
    echo Common issues:
    echo 1. XAMPP MySQL not running - start it from XAMPP Control Panel
    echo 2. Port 8080 already in use - close other applications using this port
    echo 3. Database connection failed - check MySQL credentials
    echo.
    pause
)
