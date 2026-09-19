#!/usr/bin/env bash
# Pants-friendly CI for exped-service (Prisma + ruff + pytest + compileall).
# DATABASE_URL must be injected (GitHub secret NEON_TEST_DATABASE_URL). Never echo it.
set -euo pipefail
cd "$(dirname "$0")"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set. Inject secrets.NEON_TEST_DATABASE_URL (Neon test branch only)." >&2
  exit 1
fi

case "${DATABASE_URL}" in
  *sslmode=*) ;;
  *\?*) DATABASE_URL="${DATABASE_URL}&sslmode=require" ;;
  *) DATABASE_URL="${DATABASE_URL}?sslmode=require" ;;
esac
export DATABASE_URL

export SECRET_KEY="${SECRET_KEY:-ci-test-secret}"
export INTERNAL_API_KEY="${INTERNAL_API_KEY:-ci-test-internal}"
export SESSION_VALIDATION_ENABLED="${SESSION_VALIDATION_ENABLED:-false}"

echo "==> [exped-service] ruff"
ruff check app tests
ruff format --check app tests

echo "==> [exped-service] prisma generate"
python -m prisma generate

if [[ "${PRISMA_DB_PUSH:-0}" == "1" ]]; then
  echo "==> [exped-service] prisma db push"
  python -m prisma db push
fi

echo "==> [exped-service] pytest"
pytest tests/ -q

echo "==> [exped-service] compileall"
python -m compileall -q app

echo "==> [exped-service] OK"
