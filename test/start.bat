@echo off
title DLP Training Platform v2.0
color 0A

echo ============================================
echo   DLP Training Platform v2.0 - Starting...
echo ============================================
echo.

set "ROOT=%~dp0"

if exist "%ROOT%test\backend\main.py" (
    set "BACKEND=%ROOT%test\backend"
    set "FRONTEND=%ROOT%test\frontend"
) else if exist "%ROOT%backend\main.py" (
    set "BACKEND=%ROOT%backend"
    set "FRONTEND=%ROOT%frontend"
) else (
    echo [ERROR] Cannot find backend folder.
    echo Current location: %ROOT%
    pause
    exit /b 1
)

set "PYTHON="

py -3.13 --version >nul 2>&1
if not errorlevel 1 set "PYTHON=py -3.13"

if not defined PYTHON (
    py -3.12 --version >nul 2>&1
    if not errorlevel 1 set "PYTHON=py -3.12"
)

if not defined PYTHON (
    py -3.11 --version >nul 2>&1
    if not errorlevel 1 set "PYTHON=py -3.11"
)

if not defined PYTHON (
    echo [ERROR] No compatible Python 3.11-3.13 found.
    echo Install Python 3.12: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [INFO] Using: %PYTHON%
echo.

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install: https://nodejs.org
    pause
    exit /b 1
)

set "VENV=%BACKEND%\venv"

if not exist "%VENV%\Scripts\activate.bat" (
    echo [1/3] Creating virtual environment...
    %PYTHON% -m venv "%VENV%"
    if errorlevel 1 (
        echo [ERROR] Failed to create venv
        pause
        exit /b 1
    )
    echo       Done.
) else (
    echo [1/3] Virtual environment already exists.
)
echo.

echo [2/3] Installing Python dependencies...
"%VENV%\Scripts\pip.exe" install -r "%BACKEND%\requirements.txt" --quiet
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies
    pause
    exit /b 1
)
echo       Done.
echo.

echo [3/3] Checking Node.js dependencies...
cd /d "%FRONTEND%"
if not exist "node_modules" (
    echo       Running npm install...
    npm install --silent
    if errorlevel 1 (
        echo [ERROR] Failed to install Node.js dependencies
        pause
        exit /b 1
    )
) else (
    echo       Already installed, skipping.
)
echo       Done.
echo.

echo ============================================
echo  Launching servers...
echo  Backend  ^>  http://localhost:8000
echo  Frontend ^>  http://localhost:5173
echo  Close the server windows to stop.
echo ============================================
echo.

start "DLP Backend" cmd /k "cd /d "%BACKEND%" && call venv\Scripts\activate && uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

start "DLP Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

timeout /t 5 /nobreak >nul
start http://localhost:5173

echo Done! Close the server windows to stop.
pause
