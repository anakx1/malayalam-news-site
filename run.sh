#!/bin/bash
# Malayalam News Hub - Run Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VENV_DIR=".venv"

# Activate virtual environment if it exists
if [ -d "$VENV_DIR" ]; then
    echo "Activating virtual environment..."
    source "$VENV_DIR/bin/activate"
fi

# Detect LAN IP
LAN_IP=$(ip addr show 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -n 1 || true)

echo "========================================"
echo "  Malayalam News Hub"
echo "========================================"
echo ""
echo "Local URL:  http://127.0.0.1:8000"
if [ -n "$LAN_IP" ]; then
    echo "LAN URL:    http://$LAN_IP:8000"
fi
echo ""
echo "Press CTRL+C to stop"
echo "========================================"
echo ""

# Install dependencies if needed
if command -v pip &> /dev/null; then
    pip install -q -r requirements.txt 2>/dev/null || true
fi

# Run the application
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
