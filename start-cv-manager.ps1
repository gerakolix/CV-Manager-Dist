#!/usr/bin/env pwsh
# Start CV Manager - Runs the dev server (API + Vite)

Write-Host "Starting CV Manager..." -ForegroundColor Green
Write-Host "Server will run on: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Client will run on: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Auto-install if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "First run - installing dependencies..." -ForegroundColor Yellow
    npm install
}

npm run dev
