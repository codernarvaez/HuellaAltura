#!/usr/bin/env bash
# Genera APK standalone (JS empaquetado) vía EAS — NO necesita Metro.
# Uso: bash HAMobile/scripts/build-preview-apk.sh
#
# Si usaste build-dev-apk.sh (perfil development), esa APK SÍ requiere:
#   bash HAMobile/scripts/dev-start.sh
#   adb reverse tcp:8081 tcp:8081   # si el teléfono va por USB
set -euo pipefail
cd "$(dirname "$0")/.."

PROFILE="${1:-preview}"

echo "==> Prechecks (perfil: ${PROFILE})"

if [[ ! -f .env ]]; then
  echo "Falta .env — copia .env.example y completa tokens."
  exit 1
fi

get_env() {
  local key="$1"
  grep -E "^[[:space:]]*${key}=" .env | tail -1 | cut -d= -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN="$(get_env EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN)"
RNMAPBOX_MAPS_DOWNLOAD_TOKEN="$(get_env RNMAPBOX_MAPS_DOWNLOAD_TOKEN)"
EXPO_PUBLIC_API_BASE_URL="$(get_env EXPO_PUBLIC_API_BASE_URL)"
EXPO_PUBLIC_EXPED_API_URL="$(get_env EXPO_PUBLIC_EXPED_API_URL)"

export EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN RNMAPBOX_MAPS_DOWNLOAD_TOKEN
export EXPO_PUBLIC_API_BASE_URL EXPO_PUBLIC_EXPED_API_URL
export MAPBOX_DOWNLOADS_TOKEN="$RNMAPBOX_MAPS_DOWNLOAD_TOKEN"

if [[ -z "$EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN" || "$EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN" != pk.* ]]; then
  echo "Falta EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.… en .env"
  exit 1
fi
echo "✓ Mapbox pk. (runtime)"

if [[ -z "$RNMAPBOX_MAPS_DOWNLOAD_TOKEN" || "$RNMAPBOX_MAPS_DOWNLOAD_TOKEN" != sk.* ]]; then
  echo "Falta RNMAPBOX_MAPS_DOWNLOAD_TOKEN=sk.… en .env (scope DOWNLOADS:READ)"
  exit 1
fi
echo "✓ Mapbox sk. presente"

probe_code="$(
  curl -s -o /dev/null -w '%{http_code}' \
    -u "mapbox:${RNMAPBOX_MAPS_DOWNLOAD_TOKEN}" \
    'https://api.mapbox.com/downloads/v2/releases/maven/com/mapbox/maps/android-ndk27/11.23.1/android-ndk27-11.23.1.pom'
)"
if [[ "$probe_code" != "200" ]]; then
  echo "✗ Mapbox downloads rechazó el sk. (HTTP ${probe_code})."
  echo "  Crea un Secret token con scope Downloads:Read y actualiza RNMAPBOX_MAPS_DOWNLOAD_TOKEN."
  exit 1
fi
echo "✓ Mapbox sk. autorizado para downloads (Downloads:Read)"

if [[ ! -f "eas.json" ]]; then
  echo "Falta eas.json"
  exit 1
fi

if ! node -e "const e=require('./eas.json'); if(!e.build?.['${PROFILE}']) process.exit(2)"; then
  echo "Perfil '${PROFILE}' no existe en eas.json"
  exit 1
fi

# El perfil development es Dev Client (necesita Metro). Para APK usable sola, usa preview.
if [[ "$PROFILE" == "development" ]]; then
  echo ""
  echo "⚠  Perfil 'development' = Dev Client (requiere Metro en el PC)."
  echo "   Para APK standalone usa: bash scripts/build-preview-apk.sh"
  echo ""
fi

unset EXPO_OFFLINE
unset CI
export EXPO_NO_TELEMETRY=1
export EAS_SKIP_AUTO_FINGERPRINT=1

echo "==> Sesión EAS"
if ! ACCOUNT="$(npx eas-cli whoami 2>/dev/null)"; then
  echo "No hay sesión EAS. Ejecuta: npx eas-cli login"
  exit 1
fi
echo "✓ Logueado como: $ACCOUNT"

EAS_JSON_BACKUP="$(mktemp)"
cp eas.json "$EAS_JSON_BACKUP"
restore_eas_json() {
  cp "$EAS_JSON_BACKUP" eas.json
  rm -f "$EAS_JSON_BACKUP"
}
trap restore_eas_json EXIT

PROFILE="$PROFILE" node <<'NODE'
const fs = require('fs');
const profile = process.env.PROFILE || 'preview';
const eas = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
const env = (eas.build[profile].env ||= {});
for (const key of [
  'EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN',
  'RNMAPBOX_MAPS_DOWNLOAD_TOKEN',
  'MAPBOX_DOWNLOADS_TOKEN',
  'EXPO_PUBLIC_API_BASE_URL',
  'EXPO_PUBLIC_EXPED_API_URL',
]) {
  const v = process.env[key];
  if (v) env[key] = v;
}
fs.writeFileSync('eas.json', `${JSON.stringify(eas, null, 2)}\n`);
NODE
echo "✓ Tokens inyectados en perfil ${PROFILE} (temporal)"

echo "==> Build ${PROFILE} (APK) en la nube…"
echo "    Esta APK incluye el JS bundle; no necesita Metro al abrirla."
echo ""

npx eas-cli build \
  --platform android \
  --profile "$PROFILE" \
  --non-interactive
