#!/usr/bin/env bash
# ==============================================================================
# LEGACY one-off Neon data migration helper.
# ==============================================================================
# Connection strings MUST come from the environment — never commit credentials.
#
#   export DATABASE_URL_SOURCE='postgresql://...neon.../neondb?sslmode=require'
#   export DATABASE_URL_TARGET='postgresql://...neon.../neondb?sslmode=require'
#   ./migrate_neon.sh
#
# For routine schema deploys use GitHub Actions (haback-ci.yml neon-migrate-prod)
# or:  DATABASE_URL=... python -m prisma db push
# ==============================================================================
set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

URL_SOURCE="${DATABASE_URL_SOURCE:-${URL_TRAZABILIDAD:-}}"
URL_TARGET="${DATABASE_URL_TARGET:-${URL_PRODUCCION:-}}"

if [[ -z "$URL_SOURCE" || -z "$URL_TARGET" ]]; then
  echo -e "${RED}ERROR: set DATABASE_URL_SOURCE and DATABASE_URL_TARGET (Neon URLs).${NC}" >&2
  exit 1
fi

if [[ "$URL_SOURCE" == "$URL_TARGET" ]]; then
  echo -e "${RED}ERROR: source and target URLs must differ.${NC}" >&2
  exit 1
fi

TABLAS_MOVIL=("catalogo" "parcelas" "semillas" "lotes" "asignacion_personal" "estado_etapa")

echo -e "${BLUE}>>> Neon data copy (source → target). Schema push is NOT done here.${NC}\n"

DUMP_FILE="$(mktemp -t dump_trazabilidad.XXXXXX.sql)"
trap 'rm -f "$DUMP_FILE"' EXIT

for TABLA in "${TABLAS_MOVIL[@]}"; do
  echo -e "${BLUE}--- Exporting table: $TABLA ---${NC}"
  pg_dump "$URL_SOURCE" -a -t "$TABLA" >>"$DUMP_FILE"
done

echo -e "${BLUE}--- Injecting into target ---${NC}"
psql "$URL_TARGET" -f "$DUMP_FILE"

echo -e "${GREEN}✔ Data migration finished.${NC}"
