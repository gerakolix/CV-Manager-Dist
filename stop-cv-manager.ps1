#!/usr/bin/env pwsh
# Stop CV Manager - Kills node processes on ports 3001 and 5173

Write-Host "Stopping CV Manager..." -ForegroundColor Yellow

# Find and stop processes using port 3001 (API server)
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | 
    Select-Object -ExpandProperty OwningProcess -Unique

# Find and stop processes using port 5173 (Vite dev server)
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | 
    Select-Object -ExpandProperty OwningProcess -Unique

$processes = @($port3001) + @($port5173) | Where-Object { $_ -gt 0 } | Select-Object -Unique

if ($processes.Count -gt 0) {
    foreach ($processId in $processes) {
        try {
            $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "Stopping process: $($proc.ProcessName) (PID: $processId)" -ForegroundColor Cyan
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
        }
        catch {
            Write-Host "Could not stop process $processId" -ForegroundColor Red
        }
    }
    Write-Host "CV Manager stopped successfully!" -ForegroundColor Green
}
else {
    Write-Host "No CV Manager processes found running." -ForegroundColor Gray
}
