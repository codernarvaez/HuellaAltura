#!/usr/bin/env bash
# Pants-friendly CI for exped-service (Prisma + ruff + pytest + compileall).
set -euo pipefail
cd "$(dirname "$0")"

export DATABASE_URL="${DATABASE_URL:-file:./.test_geoguard.db}"
export SECRET_KEY="${SECRET_KEY:-ci-test-secret}"
export INTERNAL_API_KEY="${INTERNAL_API_KEY:-ci-test-internal}"
export SESSION_VALIDATION_ENABLED="${SESSION_VALIDATION_ENABLED:-false}"
export PATH="$(pwd)/node_modules/.bin:${PATH}"

echo "==> [exped-service] ruff"
ruff check app tests
ruff format --check app tests

echo "==> [exped-service] prisma generate"
if python -c "import prisma" >/dev/null 2>&1; then
  python -m prisma generate
elif command -v prisma >/dev/null 2>&1; then
  prisma generate
else
  echo "ERROR: prisma not found (python -m prisma or npm CLI)" >&2
  exit 1
fi

echo "==> [exped-service] pytest"
pytest tests/ -q

echo "==> [exped-service] compileall"
python -m compileall -q app

echo "==> [exped-service] OK"
