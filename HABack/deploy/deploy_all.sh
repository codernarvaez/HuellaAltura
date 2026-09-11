#!/bin/bash
set -e

echo "Iniciando despliegue completo del backend..."

# 1. Actualizar el código fuente desde la rama principal
git pull origin develop

# 2. Ejecutar scripts modulares
# (Este script debe ejecutarse desde la raíz del proyecto)
bash deploy/deploy_auth.sh
bash deploy/deploy_exped.sh

# 3. Reinicio de servicios (Ajustar según el gestor de procesos que utilices, ej. PM2, systemd, docker)
# echo "Reiniciando servicios..."
# systemctl restart auth-service
# systemctl restart exped-service

echo "Despliegue finalizado exitosamente."