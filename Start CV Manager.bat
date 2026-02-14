@echo off
title CV Manager

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo  ERROR: Node.js is not installed!
    echo.
    echo  Please download and install Node.js from:
    echo    https://nodejs.org/
    echo.
    echo  After installing, restart this script.
    echo.
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules" (
    echo.
    echo  First run! Installing dependencies...
    echo.
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo.
        echo  ERROR: npm install failed. Check your internet connection.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo  Dependencies installed successfully!
    echo.
)

:: Check for pdflatex
where pdflatex >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo  WARNING: pdflatex not found. PDF generation won't work.
    echo  Install MiKTeX from: https://miktex.org/download
    echo.
)

echo.
echo  Starting CV Manager...
echo  The browser will open automatically.
echo  Press Ctrl+C to stop.
echo.

:: Start the dev server (opens browser automatically via Vite)
call npm run dev
