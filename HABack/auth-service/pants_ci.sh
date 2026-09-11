#!/usr/bin/env bash
# Pants-friendly CI for auth-service (Prisma + ruff + pytest + compileall).
set -euo pipefail
cd "$(dirname "$0")"

export DATABASE_URL="${DATABASE_URL:-postgresql://test:test@localhost:5432/test}"
export SECRET_KEY="${SECRET_KEY:-ci-test-secret}"
export INTERNAL_API_KEY="${INTERNAL_API_KEY:-ci-test-internal}"
export PATH="$(pwd)/node_modules/.bin:${PATH}"

echo "==> [auth-service] ruff"
ruff check app tests
ruff format --check app tests

echo "==> [auth-service] prisma generate"
if command -v prisma >/dev/null 2>&1; then
  prisma generate
elif python -c "import prisma" >/dev/null 2>&1; then
  python -m prisma generate
else
  echo "ERROR: prisma CLI not found (npm node_modules/.bin or python -m prisma)" >&2
  exit 1
fi

echo "==> [auth-service] pytest"
pytest tests/ -q

echo "==> [auth-service] compileall"
python -m compileall -q app

echo "==> [auth-service] OK"
