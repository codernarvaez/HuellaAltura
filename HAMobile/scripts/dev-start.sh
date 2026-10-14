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
echo "Nota: el APK 'development' es Dev Client y necesita este Metro."
echo "      Si ves 'Unable to load script / index.android.bundle':"
echo "        • USB:  adb reverse tcp:8081 tcp:8081"
echo "        • Wi‑Fi: mismo red que este PC; Metro ya arranca con --lan"
echo "      Para APK sin Metro: bash scripts/build-preview-apk.sh"
echo ""

# CRÍTICO: no exportar CI=1 — Metro entra en modo CI, no muestra QR y parece colgado.
unset CI
unset CONTINUOUS_INTEGRATION
export EXPO_NO_TELEMETRY=1
export EXPO_OFFLINE=1

if command -v adb >/dev/null 2>&1; then
  if adb devices 2>/dev/null | grep -qE 'device$'; then
    adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 && echo "✓ adb reverse tcp:8081 listo (USB)"
  fi
fi

# --dev-client evita abrir Expo Go (SDK 57) por error
exec npx expo start --lan --dev-client
