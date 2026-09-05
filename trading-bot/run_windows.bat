@echo off
REM Sets up (first run only) and launches the bot + dashboard in two windows,
REM then opens the dashboard in your browser. Double-click this file to run.

cd /d "%~dp0"

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -r requirements.txt

start "Trading Bot (paper mode)" cmd /k venv\Scripts\python.exe bot.py --loop
start "Dashboard" cmd /k venv\Scripts\python.exe dashboard.py

timeout /t 3 /nobreak >nul
start "" http://127.0.0.1:8000

echo.
echo Bot and dashboard are running in their own windows.
echo Close those windows (or Ctrl+C inside them) to stop everything.
