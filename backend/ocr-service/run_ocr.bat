@echo off
cd /d "%~dp0"
echo ==========================================
echo       Custodian OCR Service Setup
echo ==========================================

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not added to your system PATH.
    echo Please install Python 3.9+ and check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

:: Create virtual environment if it doesn't exist
if not exist venv (
    echo [INFO] Creating Python virtual environment (venv)...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

:: Activate the virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

:: Install python dependencies
echo [INFO] Installing required libraries (fastapi, ocrmypdf, etc.)...
pip install fastapi uvicorn img2pdf ocrmypdf pillow pydantic pypdf python-multipart pymupdf
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)

:: Start the service
echo [INFO] Starting the OCR Service on http://localhost:8765...
python app.py
pause
