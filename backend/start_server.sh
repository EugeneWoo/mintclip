#!/bin/bash
cd /Users/eugenewoo/mintclip/backend
source .venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000
