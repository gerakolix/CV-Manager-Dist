#!/bin/bash
# Start CV Manager - Runs the dev server (API + Vite)

# Change to script directory (works even when called from elsewhere)
cd "$(dirname "$0")" || exit 1

echo ""
echo "  Starting CV Manager..."
echo "  Server will run on: http://localhost:3001"
echo "  Client will run on: http://localhost:5173"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "  ERROR: Node.js is not installed!"
    echo ""
    echo "  Install via Homebrew:  brew install node"
    echo "  Or download from:      https://nodejs.org/"
    echo ""
    exit 1
fi

# Auto-install if needed
if [ ! -d "node_modules" ]; then
    echo "  First run! Installing dependencies..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "  ERROR: npm install failed. Check your internet connection."
        echo ""
        exit 1
    fi
    echo ""
    echo "  Dependencies installed successfully!"
    echo ""
fi

# Check for pdflatex
if ! command -v pdflatex &> /dev/null; then
    echo "  WARNING: pdflatex not found. PDF generation won't work."
    echo "  Install via Homebrew:  brew install --cask mactex"
    echo ""
fi

echo "  The browser will open automatically."
echo "  Press Ctrl+C to stop."
echo ""

# Start the dev server (Vite opens browser automatically)
npm run dev
