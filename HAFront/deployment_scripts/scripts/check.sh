#!/bin/bash

##############################################################################
# Type Check and Lint
#
# Verifica que no hay errores de tipos TypeScript ni problemas de linting
#
# Uso:
#   bash deployment_scripts/scripts/check.sh
#
# Qué verifica:
#   ✅ Errores de tipos TypeScript
#   ✅ Archivos Astro
#   ✅ Sintaxis e importaciones
#
# Salida exitosa:
#   "✅ Type checking passed"
#
# Nota:
#   Este script se ejecuta automáticamente en:
#   - Pre-commit (hooks)
#   - Build (antes de compilar)
#   - CI/CD (antes de desplegar)
##############################################################################

set -e

echo "========================================================================"
echo "Verificando Tipos TypeScript y Linting"
echo "========================================================================"
echo ""

# Verificar que estamos en la carpeta correcta
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json"
    exit 1
fi

echo "Instalando dependencias si es necesario..."
if [ ! -d "node_modules" ]; then
    npm install
fi

echo ""
echo "[1/2] Verificando tipos TypeScript..."
npm run check

echo ""
echo "[2/2] Ejecutando linter..."
npm run lint

echo ""
echo "========================================================================"
echo "✅ Verificación completada - sin errores"
echo "========================================================================"
echo ""
echo "Puedes proceder con:"
echo "  • Desarrollo:   bash deployment_scripts/scripts/start_dev.sh"
echo "  • Compilar:     bash deployment_scripts/scripts/build.sh"
