#!/bin/bash
# CV Manager - First-Time Setup (macOS / Linux)

echo ""
echo "  =========================================="
echo "   CV Manager - First-Time Setup"
echo "  =========================================="
echo ""

MISSING=0

# Check for Node.js
echo "  Checking Node.js..."
if command -v node &> /dev/null; then
    echo "  [OK] Node.js $(node --version) found."
else
    echo "  [X] Node.js is NOT installed."
    echo ""
    echo "      Install via Homebrew:  brew install node"
    echo "      Or download from:      https://nodejs.org/"
    echo ""
    MISSING=1
fi

# Check for pdflatex
echo "  Checking pdflatex (LaTeX)..."
if command -v pdflatex &> /dev/null; then
    echo "  [OK] pdflatex found."
else
    echo "  [X] pdflatex is NOT installed."
    echo ""
    echo "      Install via Homebrew:  brew install --cask mactex"
    echo "      Or BasicTeX:           brew install --cask basictex"
    echo "      Or download from:      https://tug.org/mactex/"
    echo ""
    echo "      This is needed to generate PDF files."
    echo ""
    MISSING=1
fi

echo ""

if [ "$MISSING" -eq 1 ]; then
    echo "  Please install the missing software above, then run this again."
    echo ""
    exit 1
fi

# Install npm dependencies
echo "  Installing dependencies..."
echo ""
npm install
if [ $? -ne 0 ]; then
    echo ""
    echo "  ERROR: npm install failed."
    echo ""
    exit 1
fi

echo ""
echo "  =========================================="
echo "   Setup complete!"
echo "  =========================================="
echo ""
echo "  To start CV Manager:"
echo "    ./start-cv-manager.sh"
echo "    Or run: npm run dev"
echo ""
