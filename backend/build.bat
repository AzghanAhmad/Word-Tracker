@echo off
REM Build script for Word Tracker Backend on Windows with XAMPP

echo ========================================
echo Building Word Tracker Backend
echo ========================================

REM Check for GCC in common locations
if exist "C:\msys64\mingw64\bin\gcc.exe" (
    set "PATH=%PATH%;C:\msys64\mingw64\bin"
) else if exist "C:\msys64\ucrt64\bin\gcc.exe" (
    set "PATH=%PATH%;C:\msys64\ucrt64\bin"
)

REM Check if gcc is available (MinGW)
where gcc >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Found GCC compiler
    goto :build_gcc
)

echo ERROR: GCC compiler not found!
echo.
echo Please install MinGW-w64 or MSYS2 to compile the backend.
echo.
echo Installation options:
echo 1. MSYS2: https://www.msys2.org/
echo    After installing MSYS2, run: pacman -S mingw-w64-x86_64-gcc
echo.
echo 2. MinGW-w64: https://sourceforge.net/projects/mingw-w64/
echo.
echo Also ensure you have:
echo - MySQL C Connector: https://dev.mysql.com/downloads/connector/c/
echo - libsodium: Install via MSYS2 with: pacman -S mingw-w64-x86_64-libsodium
echo.
pause
exit /b 1

:build_gcc
echo.
echo Compiling backend with GCC...
echo.

REM Detect MySQL Path
set "MYSQL_INCLUDE="
set "MYSQL_LIB="

if exist "C:\xampp\mysql\include" (
    echo Found XAMPP MySQL
    set "MYSQL_INCLUDE=C:\xampp\mysql\include"
    set "MYSQL_LIB=C:\xampp\mysql\lib"
) else if exist "C:\Program Files\MySQL\MySQL Server 8.0\include" (
    echo Found Standard MySQL
    set "MYSQL_INCLUDE=C:\Program Files\MySQL\MySQL Server 8.0\include"
    set "MYSQL_LIB=C:\Program Files\MySQL\MySQL Server 8.0\lib"
) else (
    echo ERROR: MySQL headers not found in XAMPP or Program Files!
    echo Please verify your MySQL installation.
    pause
    exit /b 1
)

REM Compile the backend
gcc -o server.exe main.c auth.c db.c cJSON.c mongoose.c ^
    -I"%MYSQL_INCLUDE%" ^
    -I"C:/msys64/mingw64/include" ^
    -L"%MYSQL_LIB%" ^
    -L"C:/msys64/mingw64/lib" ^
    -lmysqlclient -lsodium -lws2_32 -lbcrypt -ladvapi32 -O2

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Build successful! Created server.exe
    echo ========================================
    echo.
    echo To run the server, execute: run.bat
    echo.
) else (
    echo.
    echo ========================================
    echo Build failed!
    echo ========================================
    echo.
    echo Common issues:
    echo 1. MySQL C Connector not found - adjust the -I and -L paths above
    echo 2. libsodium not found - install via MSYS2: pacman -S mingw-w64-x86_64-libsodium
    echo 3. Missing dependencies - ensure all required libraries are installed
    echo.
    pause
    exit /b 1
)

pause
