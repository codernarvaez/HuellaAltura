FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PRISMA_BINARY_CACHE_DIR=/app/.prisma-binaries

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl libatomic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN DATABASE_URL="postgresql://x:x@localhost/x" python -m prisma generate

EXPOSE 8001
CMD ["sh", "-c", "python -m prisma db push --skip-generate && uvicorn app.main:app --host 0.0.0.0 --port 8001 --proxy-headers"]
