#!/usr/bin/env bash
# Pants-friendly CI for exped-service (Prisma + ruff + pytest + compileall).
set -euo pipefail
cd "$(dirname "$0")"

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ "${CI:-}" == "true" ]]; then
    echo "ERROR: DATABASE_URL is required in CI (inject Neon test branch URL)." >&2
    exit 1
  fi
  export DATABASE_URL="postgresql://test:test@127.0.0.1:5432/test"
fi

export SECRET_KEY="${SECRET_KEY:-ci-test-secret}"
export INTERNAL_API_KEY="${INTERNAL_API_KEY:-ci-test-internal}"
export SESSION_VALIDATION_ENABLED="${SESSION_VALIDATION_ENABLED:-false}"

echo "==> [exped-service] ruff"
ruff check app tests
ruff format --check app tests

echo "==> [exped-service] prisma generate"
python -m prisma generate

if [[ "${PRISMA_DB_PUSH:-0}" == "1" ]]; then
  echo "==> [exped-service] prisma db push (test schema sync)"
  python -m prisma db push
fi

echo "==> [exped-service] pytest"
pytest tests/ -q

echo "==> [exped-service] compileall"
python -m compileall -q app

echo "==> [exped-service] OK"
