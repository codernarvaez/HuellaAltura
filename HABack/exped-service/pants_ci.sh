#!/usr/bin/env bash
# Pants-friendly CI for exped-service (Prisma + ruff + pytest + compileall).
set -euo pipefail
cd "$(dirname "$0")"

export DATABASE_URL="${DATABASE_URL:-file:./.test_geoguard.db}"
export SECRET_KEY="${SECRET_KEY:-ci-test-secret}"
export INTERNAL_API_KEY="${INTERNAL_API_KEY:-ci-test-internal}"
export SESSION_VALIDATION_ENABLED="${SESSION_VALIDATION_ENABLED:-false}"

echo "==> [exped-service] ruff"
ruff check app tests
ruff format --check app tests

# Match prisma-client-py expected engine (do not use mismatched npm prisma CLI).
echo "==> [exped-service] prisma generate"
python -m prisma generate

echo "==> [exped-service] pytest"
pytest tests/ -q

echo "==> [exped-service] compileall"
python -m compileall -q app

echo "==> [exped-service] OK"
