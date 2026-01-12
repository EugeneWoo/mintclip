#!/bin/bash

# Start script for YT Coach backend
# Automatically prevents .pyc files and starts uvicorn

# Clean existing __pycache__ directories
echo "🧹 Cleaning __pycache__ directories..."
find app -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null

# Start uvicorn with PYTHONDONTWRITEBYTECODE=1
echo "🚀 Starting backend server (no .pyc files will be created)..."
PYTHONDONTWRITEBYTECODE=1 ./venv/bin/uvicorn app.main:app --reload --port 8000
