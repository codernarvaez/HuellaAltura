#!/usr/bin/env bash
# Select Pants targets changed since a git rev and map them to firebase --only.
#
# This repo has no firebase.json and HAFront is Astro SSR (@astrojs/node
# standalone), so the default is a dry selection. A real deploy is refused
# until firebase.json exists AND FIREBASE_DEPLOY=1 is set.
#
# Usage:
#   ./scripts/firebase-changed-deploy.sh
#   ./scripts/firebase-changed-deploy.sh origin/develop
#   FIREBASE_DEPLOY=1 ./scripts/firebase-changed-deploy.sh origin/develop
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SINCE="${1:-origin/develop}"
PANTS="${PANTS:-./pants}"

if [[ ! -x "$PANTS" && ! -f "$PANTS" ]]; then
  echo "ERROR: Pants launcher not found at $PANTS" >&2
  exit 1
fi

echo "==> changed targets since ${SINCE}"
# --changed-dependents=transitive includes dependents of edited files.
# list does not execute builds, so it is safe as a cache-neutral probe.
mapfile -t CHANGED < <("$PANTS" --changed-since="$SINCE" --changed-dependents=transitive list)

if [[ ${#CHANGED[@]} -eq 0 ]]; then
  echo "No Pants targets changed. Nothing to deploy."
  exit 0
fi

printf '  %s\n' "${CHANGED[@]}"

ONLY=()
for target in "${CHANGED[@]}"; do
  case "$target" in
    HAFront:*)
      ONLY+=("hosting:hafront")
      ;;
    HABack/auth-service:*)
      ONLY+=("functions:auth")
      ;;
    HABack/exped-service:*)
      ONLY+=("functions:exped")
      ;;
    HAMobile:*)
      # Expo is not a Firebase Hosting/Functions artifact.
      ;;
  esac
done

# Deduplicate while keeping order.
if [[ ${#ONLY[@]} -gt 0 ]]; then
  mapfile -t ONLY < <(printf '%s\n' "${ONLY[@]}" | awk '!seen[$0]++')
fi

if [[ ${#ONLY[@]} -eq 0 ]]; then
  echo "==> no Firebase-mapped targets in the change set"
  exit 0
fi

ONLY_ARG="$(IFS=,; echo "${ONLY[*]}")"
echo "==> firebase --only ${ONLY_ARG}"

if [[ ! -f firebase.json ]]; then
  echo "REFUSED: firebase.json is not in the repo root."
  echo "HAFront output is a Node server (dist/server/entry.mjs), not a Hosting public/ tree."
  echo "Wire Hosting rewrites to Cloud Run (or change Astro to output:static) before deploying."
  exit 2
fi

if [[ "${FIREBASE_DEPLOY:-0}" != "1" ]]; then
  echo "DRY-RUN: set FIREBASE_DEPLOY=1 to execute:"
  echo "  firebase deploy --only ${ONLY_ARG} --dry-run"
  exit 0
fi

exec firebase deploy --only "$ONLY_ARG" --dry-run
