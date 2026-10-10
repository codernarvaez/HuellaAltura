#!/usr/bin/env bash
# Pants-friendly CI for sender-service (ruff + pytest + compileall).
# No Prisma / Neon — solo API de correo (Resend vía httpx).
set -euo pipefail
cd "$(dirname "$0")"

export RESEND_API_KEY="${RESEND_API_KEY:-re_ci_test_key_not_for_prod}"
export RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL:-CI <onboarding@resend.dev>}"
export INTERNAL_API_KEY="${INTERNAL_API_KEY:-ci-test-internal}"
export FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:4321}"
export ENVIRONMENT="${ENVIRONMENT:-test}"

echo "==> [sender-service] ruff"
ruff check app tests
ruff format --check app tests

echo "==> [sender-service] pytest"
pytest tests/ -q

echo "==> [sender-service] compileall"
python -m compileall -q app

echo "==> [sender-service] OK"
