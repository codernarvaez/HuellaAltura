#!/usr/bin/env bash
# Pants-friendly CI for bcregister-service (ruff + pytest + compileall).
# Polygon en dry-run; no requiere RPC ni gas.
set -euo pipefail
cd "$(dirname "$0")"

export INTERNAL_API_KEY="${INTERNAL_API_KEY:-ci-test-internal}"
export SENDER_SERVICE_URL="${SENDER_SERVICE_URL:-http://127.0.0.1:8040}"
export ENVIRONMENT="${ENVIRONMENT:-test}"
export POLYGON_RPC_URL="${POLYGON_RPC_URL:-https://rpc-amoy.polygon.technology}"
export POLYGON_CHAIN_ID="${POLYGON_CHAIN_ID:-80002}"
# Hardhat/Anvil account #0 (solo CI / dry-run)
export POLYGON_PRIVATE_KEY="${POLYGON_PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
export POLYGON_DRY_RUN="${POLYGON_DRY_RUN:-true}"

echo "==> [bcregister-service] ruff"
ruff check app tests
ruff format --check app tests

echo "==> [bcregister-service] pytest"
pytest tests/ -q

echo "==> [bcregister-service] compileall"
python -m compileall -q app

echo "==> [bcregister-service] OK"
