#!/bin/bash
# Stop CV Manager - Kills node processes on ports 3001 and 5173

echo "  Stopping CV Manager..."

FOUND=0

for PORT in 3001 5173; do
    # Find PIDs listening on the port (works on macOS and Linux)
    PIDS=$(lsof -ti ":$PORT" 2>/dev/null)
    if [ -n "$PIDS" ]; then
        for PID in $PIDS; do
            PROC_NAME=$(ps -p "$PID" -o comm= 2>/dev/null)
            echo "  Stopping process: $PROC_NAME (PID: $PID) on port $PORT"
            kill "$PID" 2>/dev/null
            FOUND=1
        done
    fi
done

if [ "$FOUND" -eq 1 ]; then
    echo "  CV Manager stopped successfully!"
else
    echo "  No CV Manager processes found running."
fi
