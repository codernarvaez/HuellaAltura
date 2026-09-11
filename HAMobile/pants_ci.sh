#!/usr/bin/env bash
# Pants CI entry for HAMobile (Expo).
set -euo pipefail
cd "$(dirname "$0")"

echo "==> [hamobile] lint (local)"
npm run lint

echo "==> [hamobile] build"
npm run build

echo "==> [hamobile] OK"
