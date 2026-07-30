#!/bin/bash
set -e

echo "Desplegando Exped Service..."

# Navegar al directorio del servicio
cd HABack/exped-service

# Instalar dependencias
pip install -r requirements.txt

# Generar cliente de Prisma
prisma generate

echo "Exped Service preparado."