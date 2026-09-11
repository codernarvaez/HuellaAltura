#!/usr/bin/env bash
# Pants CI entry for HAFront (Astro).
set -euo pipefail
cd "$(dirname "$0")"

echo "==> [hafront] check"
npm run check

echo "==> [hafront] build"
npm run build

echo "==> [hafront] OK"
