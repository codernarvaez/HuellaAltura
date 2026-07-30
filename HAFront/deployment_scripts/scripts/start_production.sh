#!/bin/bash

##############################################################################
# Start Production Server
#
# Inicia el servidor en modo producción (desde dist/ compilado)
#
# Uso:
#   bash deployment_scripts/scripts/build.sh           # Compilar primero
#   bash deployment_scripts/scripts/start_production.sh # Ejecutar
#
# Acceso:
#   http://localhost:3000
#
# Características:
#   ✅ Build optimizado y minificado
#   ✅ Rendimiento máximo
#   ✅ Listo para producción
#
# Nota:
#   Asegúrate de hacer build primero:
#   bash deployment_scripts/scripts/build.sh
##############################################################################

set -e

echo "========================================================================"
echo "Iniciando Servidor de Producción"
echo "========================================================================"
echo ""

# Verificar que dist existe
if [ ! -d "dist" ]; then
    echo "❌ Error: Carpeta dist/ no encontrada"
    echo ""
    echo "Debes compilar primero:"
    echo "  bash deployment_scripts/scripts/build.sh"
    echo ""
    echo "Luego ejecutar este script"
    exit 1
fi

echo "Verificando dependencias..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules no encontrado. Instalando..."
    npm install
fi

echo "  ✅ OK"
echo ""
echo "Iniciando servidor..."
echo "  📍 http://localhost:3000"
echo "  🚀 Modo: PRODUCCIÓN (optimizado)"
echo "  📝 Presiona Ctrl+C para detener"
echo ""
echo "========================================================================"
echo ""

npm start
