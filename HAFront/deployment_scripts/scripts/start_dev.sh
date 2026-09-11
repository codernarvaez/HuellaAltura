#!/bin/bash

##############################################################################
# Start Development Server
#
# Inicia el servidor de desarrollo de Astro con hot reload
#
# Uso:
#   bash deployment_scripts/scripts/start_dev.sh
#
# Acceso:
#   http://localhost:3000 (por defecto)
#
# Características:
#   ✅ Hot reload automático
#   ✅ TypeScript compilado en tiempo real
#   ✅ Tailwind CSS en vivo
#   ✅ Integración con API backend
##############################################################################

set -e

echo "========================================================================"
echo "Iniciando Servidor de Desarrollo"
echo "========================================================================"
echo ""

# Verificar que estamos en la carpeta correcta
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json"
    echo "   Asegúrate de ejecutar desde HAFront/"
    echo ""
    echo "   Uso correcto:"
    echo "     cd HAFront"
    echo "     bash deployment_scripts/scripts/start_dev.sh"
    exit 1
fi

echo "Verificando dependencias..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules no encontrado. Instalando dependencias..."
    npm install
fi

echo ""
echo "Iniciando servidor..."
echo "  📍 http://localhost:3000"
echo "  📝 Presiona Ctrl+C para detener"
echo ""
echo "========================================================================"
echo ""

npm run dev
