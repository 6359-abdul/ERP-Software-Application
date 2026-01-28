@echo off
REM Start the Backend Server using the virtual environment
echo Starting Backend Server...
call .venv\Scripts\activate.bat
python erp-backend\app.py
pause
