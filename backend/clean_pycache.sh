#!/bin/bash

# Script to prevent and clean .pyc files in services/__pycache__/
# Usage: ./clean_pycache.sh

# Remove existing __pycache__ directories
echo "Removing existing __pycache__ directories..."
find backend/app/services -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
echo "✓ Cleaned existing __pycache__ directories"

# Set PYTHONDONTWRITEBYTECODE environment variable
echo ""
echo "To prevent .pyc files from being created, add this to your shell profile:"
echo "export PYTHONDONTWRITEBYTECODE=1"
echo ""
echo "Or run your Python/uvicorn commands with:"
echo "PYTHONDONTWRITEBYTECODE=1 ./venv/bin/uvicorn app.main:app --reload --port 8000"
echo ""
echo "Alternatively, add this to backend/.env:"
echo "PYTHONDONTWRITEBYTECODE=1"
