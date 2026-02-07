@echo off
echo ==========================================
echo      Building Frontend for Deployment
echo ==========================================
echo.

cd frontend
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error installing dependencies!
    pause
    exit /b %errorlevel%
)

echo.
echo Building project...
call npm run build
if %errorlevel% neq 0 (
    echo Error building project!
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo      Build Complete!
echo      The 'frontend/dist' folder is ready.
echo ==========================================
pause
