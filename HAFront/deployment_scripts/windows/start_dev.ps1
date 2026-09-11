# Script de PowerShell para iniciar desarrollo
# Uso: .\deployment_scripts\windows\start_dev.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Iniciando Servidor de Desarrollo" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar package.json
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encontró package.json" -ForegroundColor Red
    exit 1
}

# Verificar node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules no encontrado. Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "Iniciando servidor..." -ForegroundColor Yellow
Write-Host "  📍 http://localhost:3000" -ForegroundColor Cyan
Write-Host "  📝 Presiona Ctrl+C para detener" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

npm run dev
