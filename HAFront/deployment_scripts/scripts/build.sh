#!/bin/bash

##############################################################################
# Build Production
#
# Compila el frontend para producción, optimizando todos los assets
#
# Uso:
#   bash deployment_scripts/scripts/build.sh
#
# Output:
#   dist/  ← Carpeta lista para desplegar
#
# Características:
#   ✅ Minificación de código
#   ✅ Optimización de imágenes
#   ✅ CSS y JS bundleados
#   ✅ Tree shaking automático
#   ✅ Generación de sitemap (si aplica)
#
# Próximo paso:
#   bash deployment_scripts/scripts/start_production.sh
##############################################################################

set -e

echo "========================================================================"
echo "Compilando Frontend para Producción"
echo "========================================================================"
echo ""

# Verificar que estamos en la carpeta correcta
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json"
    exit 1
fi

echo "[1/3] Verificando dependencias..."
if [ ! -d "node_modules" ]; then
    echo "  Instalando..."
    npm install
fi
echo "  ✅ OK"
echo ""

echo "[2/3] Verificando tipos TypeScript..."
npm run check
echo "  ✅ OK"
echo ""

echo "[3/3] Compilando..."
npm run build

echo ""
echo "========================================================================"
echo "✅ Build completado exitosamente"
echo "========================================================================"
echo ""
echo "Output guardado en: dist/"
echo ""
echo "Para probar localmente:"
echo "  bash deployment_scripts/scripts/start_production.sh"
echo ""
echo "Para desplegar en Render:"
echo "  1. Commit los cambios (git add -A && git commit)"
echo "  2. Push a GitHub (git push)"
echo "  3. Render se dispara automáticamente"
echo "   o ejecuta manualmente:"
echo "  4. bash deployment_scripts/scripts/deploy.sh"
