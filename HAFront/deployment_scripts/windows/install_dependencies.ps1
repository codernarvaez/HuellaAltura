# Script de PowerShell para instalar dependencias
# Uso: .\deployment_scripts\windows\install_dependencies.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Instalando Dependencias del Frontend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "[1/3] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    Write-Host "  ✅ Node.js $nodeVersion detectado" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Error: Node.js no está instalado" -ForegroundColor Red
    Write-Host "     Descarga desde: https://nodejs.org (v22.12.0+)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Verificar npm
Write-Host "[2/3] Verificando npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm -v
    Write-Host "  ✅ npm $npmVersion detectado" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Error: npm no está instalado" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Instalar dependencias
Write-Host "[3/3] Instalando paquetes..." -ForegroundColor Yellow
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent (Split-Path -Parent $scriptDir)

Push-Location $rootDir
npm install
Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Cyan
Write-Host "  • Desarrollo:   .\deployment_scripts\windows\start_dev.ps1" -ForegroundColor White
Write-Host "  • Producción:   .\deployment_scripts\windows\build.ps1" -ForegroundColor White
