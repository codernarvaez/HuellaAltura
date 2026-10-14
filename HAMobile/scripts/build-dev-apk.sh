#!/usr/bin/env bash
# Genera APK Dev Client (instalable) vía EAS Cloud.
# Uso: bash HAMobile/scripts/build-dev-apk.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Prechecks"

if [[ ! -f .env ]]; then
  echo "Falta .env — copia .env.example y completa tokens."
  exit 1
fi

# Lectura robusta de .env (evita fallos de `source` con caracteres especiales)
get_env() {
  local key="$1"
  # toma la última línea no comentada con esa clave
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
echo "✓ Mapbox sk. (download)"

unset EXPO_OFFLINE
unset CI
export EXPO_NO_TELEMETRY=1
# Workaround: eas-cli + brace-expansion rompe el fingerprint local
export EAS_SKIP_AUTO_FINGERPRINT=1

echo "==> Sesión EAS"
if ! ACCOUNT="$(npx eas-cli whoami 2>/dev/null)"; then
  echo "No hay sesión EAS. En tu terminal:"
  echo "  npx eas-cli login"
  echo "Luego: bash scripts/build-dev-apk.sh"
  exit 1
fi
echo "✓ Logueado como: $ACCOUNT"

# eas-cli ya no acepta --env en `build`. Inyectamos tokens en el perfil
# development de eas.json solo durante este comando y restauramos al salir.
EAS_JSON_BACKUP="$(mktemp)"
cp eas.json "$EAS_JSON_BACKUP"
restore_eas_json() {
  cp "$EAS_JSON_BACKUP" eas.json
  rm -f "$EAS_JSON_BACKUP"
}
trap restore_eas_json EXIT

node <<'NODE'
const fs = require('fs');
const eas = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
const env = (eas.build.development.env ||= {});
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
echo "✓ Tokens inyectados en perfil development (temporal)"

echo "==> Build development (APK) en la nube…"
echo "    Al terminar, EAS mostrará el link de descarga."
echo ""

npx eas-cli build \
  --platform android \
  --profile development \
  --non-interactive
