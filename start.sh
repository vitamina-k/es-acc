#!/bin/sh
set -e

echo "▶ Arrancando FastAPI (puerto 8000)..."
cd /app/api
uv run uvicorn esacc.main:app --host 0.0.0.0 --port 8000 &

echo "▶ Arrancando frontend Node.js (puerto 5000)..."
cd /app/frontend
exec npm start
