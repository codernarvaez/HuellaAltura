#!/usr/bin/env bash
# Pants-friendly CI for auth-service (Prisma + ruff + pytest + compileall).
set -euo pipefail
cd "$(dirname "$0")"

export DATABASE_URL="${DATABASE_URL:-postgresql://test:test@localhost:5432/test}"
export SECRET_KEY="${SECRET_KEY:-ci-test-secret}"
export INTERNAL_API_KEY="${INTERNAL_API_KEY:-ci-test-internal}"

echo "==> [auth-service] ruff"
ruff check app tests
ruff format --check app tests

echo "==> [auth-service] prisma generate"
prisma generate

echo "==> [auth-service] pytest"
pytest tests/ -q

echo "==> [auth-service] compileall"
python -m compileall -q app

echo "==> [auth-service] OK"
