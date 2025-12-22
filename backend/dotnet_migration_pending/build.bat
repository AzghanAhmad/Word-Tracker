@echo off
echo Building Word Tracker Backend (C#)...
"C:\Program Files\dotnet\dotnet.exe" build
if %errorlevel% neq 0 (
    echo Build failed.
    exit /b %errorlevel%
)
echo Build successful.
