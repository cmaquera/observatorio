# Script para iniciar el Observatorio de Obras Públicas del Perú 🇵🇪

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  OBSERVATORIO DE OBRAS PÚBLICAS DEL PERÚ 🇵🇪           " -ForegroundColor Yellow
Write-Host "  Iniciando Backend FastAPI y Frontend Vite React...    " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Iniciar Backend
$backendJob = Start-Process python -ArgumentList "run_server.py" -WorkingDirectory "$PSScriptRoot\backend" -PassThru
Write-Host "[OK] Backend FastAPI ejecutándose en: http://127.0.0.1:8000 (PID: $($backendJob.Id))" -ForegroundColor Green

# 2. Iniciar Frontend
$frontendJob = Start-Process npm -ArgumentList "run", "dev" -WorkingDirectory "$PSScriptRoot\frontend" -PassThru
Write-Host "[OK] Frontend Vite React ejecutándose en: http://localhost:5173 (PID: $($frontendJob.Id))" -ForegroundColor Green

Write-Host "`nAmbos servicios están activos." -ForegroundColor White
Write-Host "Abre tu navegador en: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Para detener presiona Enter..."
Read-Host
Stop-Process -Id $backendJob.Id, $frontendJob.Id -Force -ErrorAction SilentlyContinue
