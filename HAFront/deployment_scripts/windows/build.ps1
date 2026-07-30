# Script de PowerShell para compilar para producción
# Uso: .\deployment_scripts\windows\build.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Compilando Frontend para Producción" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar package.json
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encontró package.json" -ForegroundColor Red
    exit 1
}

# Verificar/instalar dependencias
Write-Host "[1/3] Verificando dependencias..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "  Instalando..." -ForegroundColor Yellow
    npm install
}
Write-Host "  ✅ OK" -ForegroundColor Green
Write-Host ""

# Verificar tipos
Write-Host "[2/3] Verificando tipos TypeScript..." -ForegroundColor Yellow
npm run check
Write-Host "  ✅ OK" -ForegroundColor Green
Write-Host ""

# Compilar
Write-Host "[3/3] Compilando..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Build completado" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Output: dist/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para probar localmente:" -ForegroundColor Yellow
Write-Host "  .\deployment_scripts\windows\start_production.ps1" -ForegroundColor White
