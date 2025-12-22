@echo off
echo ===================================================
echo Starting Word Tracker Backend (WSL)
echo Connected to XAMPP MySQL on Windows (127.0.0.1:3306)
echo ===================================================

REM Kill any existing instances to prevent port conflicts
wsl killall server 2>nul

REM Run the server and keep the window open
echo Starting server on port 8080...
wsl bash -c "cd /mnt/d/0/1/word-t-main/word-t-main/backend && ./server"

echo.
echo Server crashed or stopped.
pause
