#!/usr/bin/env bash
# Arranca HAMobile para revisión local.
# Uso:  bash HAMobile/scripts/dev-start.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Creado .env desde .env.example — edítalo si hace falta."
fi

if ! grep -qE '^EXPO_PUBLIC_API_BASE_URL=.+' .env; then
  echo "Falta EXPO_PUBLIC_API_BASE_URL en .env"
  exit 1
fi
if ! grep -qE '^EXPO_PUBLIC_EXPED_API_URL=.+' .env; then
  echo "Falta EXPO_PUBLIC_EXPED_API_URL en .env"
  exit 1
fi

if ! grep -qE '^EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk\.' .env; then
  echo ""
  echo "⚠  Falta EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.… en HAMobile/.env"
  echo ""
else
  echo "✓ Mapbox pk. configurado"
fi

echo "Auth → $(grep '^EXPO_PUBLIC_API_BASE_URL=' .env | cut -d= -f2-)"
echo "Exped → $(grep '^EXPO_PUBLIC_EXPED_API_URL=' .env | cut -d= -f2-)"
echo ""
echo "Nota: abre con el Dev Client de Huella (SDK 56), no con Expo Go de Play Store (SDK 57)."
echo "      Si solo tienes Expo Go: instala el de SDK 56 → https://expo.dev/go?sdkVersion=56&platform=android&device=true"
echo "      El mapa (Mapbox) NO funciona en Expo Go; necesita Dev Client."
echo ""

# CRÍTICO: no exportar CI=1 — Metro entra en modo CI, no muestra QR y parece colgado.
unset CI
unset CONTINUOUS_INTEGRATION
export EXPO_NO_TELEMETRY=1
export EXPO_OFFLINE=1

# --dev-client evita abrir Expo Go (SDK 57) por error
exec npx expo start --lan --dev-client
