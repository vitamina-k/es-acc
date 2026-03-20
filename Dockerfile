# ── Imagen base: Python 3.12 + Node.js 20 ──────────────────────────────────
FROM python:3.12-slim

# Instalar Node.js 20
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gnupg ca-certificates \
    libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 libcairo2 libffi-dev \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Instalar uv (gestor Python)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# ── FastAPI: instalar dependencias ──────────────────────────────────────────
COPY api/pyproject.toml api/uv.lock ./api/
RUN cd api && uv sync --no-dev --no-install-project

COPY api/src/ ./api/src/
RUN cd api && uv sync --no-dev

# ── Node.js frontend: build ──────────────────────────────────────────────────
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ── Script de arranque ───────────────────────────────────────────────────────
COPY start.sh ./start.sh
RUN chmod +x start.sh

ENV NODE_ENV=production
ENV NEO4J_API_URL=http://localhost:8000

EXPOSE 5000

CMD ["./start.sh"]
