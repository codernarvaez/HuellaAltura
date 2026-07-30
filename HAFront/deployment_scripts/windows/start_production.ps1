# Script de PowerShell para iniciar servidor de producción
# Uso: .\deployment_scripts\windows\start_production.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Iniciando Servidor de Producción" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que dist existe
if (-not (Test-Path "dist")) {
    Write-Host "❌ Error: Carpeta dist/ no encontrada" -ForegroundColor Red
    Write-Host ""
    Write-Host "Debes compilar primero:" -ForegroundColor Yellow
    Write-Host "  .\deployment_scripts\windows\build.ps1" -ForegroundColor White
    exit 1
}

# Verificar dependencias
Write-Host "Verificando dependencias..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules no encontrado. Instalando..." -ForegroundColor Yellow
    npm install
}
Write-Host "  ✅ OK" -ForegroundColor Green
Write-Host ""

Write-Host "Iniciando servidor..." -ForegroundColor Yellow
Write-Host "  📍 http://localhost:3000" -ForegroundColor Cyan
Write-Host "  🚀 Modo: PRODUCCIÓN (optimizado)" -ForegroundColor Green
Write-Host "  📝 Presiona Ctrl+C para detener" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

npm start
