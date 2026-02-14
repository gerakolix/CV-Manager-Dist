@echo off
title CV Manager - Setup
echo.
echo  ==========================================
echo   CV Manager - First-Time Setup
echo  ==========================================
echo.

:: Check for Node.js
echo  Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [X] Node.js is NOT installed.
    echo.
    echo      Download from: https://nodejs.org/
    echo      Choose the LTS version and run the installer.
    echo      Make sure "Add to PATH" is checked during install.
    echo.
    set MISSING=1
) else (
    for /f "tokens=*" %%v in ('node --version') do echo  [OK] Node.js %%v found.
)

:: Check for pdflatex
echo  Checking pdflatex (LaTeX)...
where pdflatex >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [X] pdflatex is NOT installed.
    echo.
    echo      Download MiKTeX from: https://miktex.org/download
    echo      Run the installer and accept defaults.
    echo      This is needed to generate PDF files.
    echo.
    set MISSING=1
) else (
    echo  [OK] pdflatex found.
)

echo.

if defined MISSING (
    echo  Please install the missing software above, then run this again.
    echo.
    pause
    exit /b 1
)

:: Install npm dependencies
echo  Installing dependencies...
echo.
call npm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo  ERROR: npm install failed.
    echo.
    pause
    exit /b 1
)

echo.
echo  ==========================================
echo   Setup complete!
echo  ==========================================
echo.
echo  To start CV Manager:
echo    - Double-click "Start CV Manager.bat"
echo    - Or run: npm run dev
echo.
pause
