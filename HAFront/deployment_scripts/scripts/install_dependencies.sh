#!/bin/bash

##############################################################################
# Install Dependencies Script
#
# Instala las dependencias de Node.js necesarias para ejecutar el frontend
#
# Uso:
#   bash deployment_scripts/scripts/install_dependencies.sh
#
# Requisitos previos:
#   - Node.js >= 22.12.0 (node --version)
#   - npm >= 10.x
##############################################################################

set -e  # Exit on error

echo "========================================================================"
echo "Instalando Dependencias del Frontend (Astro + Tailwind + Supabase)"
echo "========================================================================"
echo ""

# Verificar Node.js
echo "[1/3] Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado."
    echo "   Descarga desde: https://nodejs.org (v22.12.0+)"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "  ✅ Node.js $NODE_VERSION detectado"
echo ""

# Verificar npm
echo "[2/3] Verificando npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm no está instalado"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "  ✅ npm $NPM_VERSION detectado"
echo ""

# Instalar dependencias
echo "[3/3] Instalando paquetes..."
cd "$(dirname "$0")/../.."  # Ir a raíz de HAFront

npm install

echo ""
echo "========================================================================"
echo "✅ Dependencias instaladas correctamente"
echo "========================================================================"
echo ""
echo "Próximos pasos:"
echo "  • Desarrollo:   bash deployment_scripts/scripts/start_dev.sh"
echo "  • Producción:   bash deployment_scripts/scripts/build.sh"
echo "  • Verificar:    bash deployment_scripts/scripts/check.sh"
