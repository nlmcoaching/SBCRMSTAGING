# Simply Breathe OS -- Dev Startup Script
# Starts: backend (Node/Express), frontend (Vite), ngrok tunnel
# Usage: Double-click start.bat  OR  run .\start.ps1 in PowerShell

$ROOT = $PSScriptRoot

Write-Host ""
Write-Host "  ======================================" -ForegroundColor Cyan
Write-Host "     Simply Breathe OS -- Starting      " -ForegroundColor Cyan
Write-Host "  ======================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  [ERROR] Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    pause
    exit 1
}

# 2. Check ngrok is installed
if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Write-Host "  [WARN] ngrok not found -- tunnel will be skipped." -ForegroundColor Yellow
    Write-Host "         Install with: winget install ngrok.ngrok" -ForegroundColor Yellow
    Write-Host ""
    $skipNgrok = $true
} else {
    $skipNgrok = $false
}

# 3. Ensure backend\.env exists
$envFile = Join-Path $ROOT "backend\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "  [WARN] backend\.env not found -- copying from .env.example" -ForegroundColor Yellow
    Copy-Item (Join-Path $ROOT "backend\.env.example") $envFile
    Write-Host "  [WARN] Add your CALENDLY_WEBHOOK_SIGNING_KEY to backend\.env when ready" -ForegroundColor Yellow
    Write-Host ""
}

# 4. Install dependencies if node_modules are missing
if (-not (Test-Path (Join-Path $ROOT "node_modules"))) {
    Write-Host "  [setup] Installing frontend dependencies..." -ForegroundColor Gray
    Push-Location $ROOT
    npm install 2>&1 | Out-Null
    Pop-Location
    Write-Host "  [setup] Frontend dependencies installed." -ForegroundColor Gray
}
if (-not (Test-Path (Join-Path $ROOT "backend\node_modules"))) {
    Write-Host "  [setup] Installing backend dependencies..." -ForegroundColor Gray
    Push-Location (Join-Path $ROOT "backend")
    npm install 2>&1 | Out-Null
    Pop-Location
    Write-Host "  [setup] Backend dependencies installed." -ForegroundColor Gray
}

# 5. Ensure backend data directory exists
$dataDir = Join-Path $ROOT "backend\data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir | Out-Null
}

# 6. Launch backend
Write-Host "  [1/3] Starting backend on port 3001..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$ROOT\backend'; `$host.UI.RawUI.WindowTitle = 'SB Backend :3001'; npm run dev"
)
Start-Sleep -Seconds 2

# 7. Launch frontend (Vite)
Write-Host "  [2/3] Starting frontend (Vite)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$ROOT'; `$host.UI.RawUI.WindowTitle = 'SB Frontend :5173'; npm run dev"
)
Start-Sleep -Seconds 3

# 8. Launch ngrok tunnel
if (-not $skipNgrok) {
    Write-Host "  [3/3] Opening ngrok tunnel to localhost:3001..." -ForegroundColor Green
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "`$host.UI.RawUI.WindowTitle = 'SB ngrok tunnel'; ngrok http 3001"
    )
    Start-Sleep -Seconds 2
} else {
    Write-Host "  [3/3] Skipping ngrok (not installed)." -ForegroundColor Yellow
}

# Done
Write-Host ""
Write-Host "  [OK] Simply Breathe OS is running." -ForegroundColor Green
Write-Host ""
Write-Host "  App      :  http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend  :  http://localhost:3001/health" -ForegroundColor Cyan
if (-not $skipNgrok) {
    Write-Host "  ngrok UI :  http://127.0.0.1:4040  (your public webhook URL is here)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Register your Calendly webhook as:" -ForegroundColor Yellow
    Write-Host "  https://<ngrok-id>.ngrok-free.app/api/webhooks/calendly" -ForegroundColor Yellow
}
Write-Host ""
