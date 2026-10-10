# syntax=docker/dockerfile:1.7
# Context: HABack/exped-service
ARG PYTHON_VERSION=3.12

# ── Stage 1: builder ───────────────────────────────────────────
FROM python:${PYTHON_VERSION}-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PRISMA_BINARY_CACHE_DIR=/opt/prisma-binaries

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      curl \
      ca-certificates \
      openssl \
      libssl-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Capa cacheable: deps + schema antes del código de la app
COPY requirements.txt ./
COPY schema.prisma ./

# Solo para prisma generate (no abre conexión real)
ARG DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?sslmode=require"
ENV DATABASE_URL=${DATABASE_URL}

RUN pip install --upgrade pip \
 && pip wheel --wheel-dir=/wheels -r requirements.txt \
 && pip install --no-index --find-links=/wheels -r requirements.txt \
 && python -m prisma generate

# ── Stage 2: runtime ───────────────────────────────────────────
FROM python:${PYTHON_VERSION}-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PRISMA_BINARY_CACHE_DIR=/opt/prisma-binaries \
    PORT=8000

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      openssl \
      libssl3 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --home /app --shell /usr/sbin/nologin app

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /opt/prisma-binaries /opt/prisma-binaries

COPY --chown=app:app . .

USER app

EXPOSE 8000

# Render inyecta PORT. 2 workers ASGI ≈ límite seguro en Starter 512MB.
# Si exped hace OOM, bajar a --workers 1.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2 --proxy-headers --forwarded-allow-ips='*'"]
