#!/bin/bash
# HABack/auth-service/entrypoint.sh

# Detener la ejecución si hay un error
set -e

echo "1. Generando el cliente de Prisma..."
prisma generate

echo "2. Ejecutando migraciones en la base de datos Neon..."
# Asegúrate de que el script tenga permisos de ejecución
sh ./migrate_neon.sh 

echo "3. Ejecutando el Seed para poblar datos iniciales..."
python seed.py

echo "4. Iniciando el servidor FastAPI de Auth..."
# El comando 'exec' es crucial aquí: reemplaza el proceso de bash con el de uvicorn,
# permitiendo que Docker gestione las señales de apagado correctamente.
exec uvicorn app.main:app --host 0.0.0.0 --port 8000