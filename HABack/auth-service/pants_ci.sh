#!/usr/bin/env bash
# Pants-friendly CI for auth-service (Prisma + ruff + pytest + compileall).
set -euo pipefail
cd "$(dirname "$0")"

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ "${CI:-}" == "true" ]]; then
    echo "ERROR: DATABASE_URL is required in CI (inject Neon test branch URL)." >&2
    exit 1
  fi
  export DATABASE_URL="postgresql://test:test@localhost:5432/test"
fi

export SECRET_KEY="${SECRET_KEY:-ci-test-secret}"
export INTERNAL_API_KEY="${INTERNAL_API_KEY:-ci-test-internal}"

echo "==> [auth-service] ruff"
ruff check app tests
ruff format --check app tests

# Use the Python CLI so the generator matches prisma-client-py (0.15.x → Prisma 5.17).
echo "==> [auth-service] prisma generate"
python -m prisma generate

# Optional schema sync against the Neon *test* branch (never enable for prod URL).
if [[ "${PRISMA_DB_PUSH:-0}" == "1" ]]; then
  echo "==> [auth-service] prisma db push (test schema sync)"
  python -m prisma db push
fi

echo "==> [auth-service] pytest"
pytest tests/ -q

echo "==> [auth-service] compileall"
python -m compileall -q app

echo "==> [auth-service] OK"
