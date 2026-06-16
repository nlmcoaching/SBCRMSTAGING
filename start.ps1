# Simply Breathe OS -- Dev Startup Script
# Starts: backend (Node/Express), frontend (Vite), ngrok tunnel
# All processes run in the background in this terminal window.
# Usage: .\start.ps1

$ROOT = $PSScriptRoot

Write-Host ""
Write-Host "  ======================================" -ForegroundColor Cyan
Write-Host "     Simply Breathe OS -- Starting      " -ForegroundColor Cyan
Write-Host "  ======================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  [ERROR] Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# 2. Check ngrok
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

# 4. Install dependencies if needed
if (-not (Test-Path (Join-Path $ROOT "node_modules"))) {
    Write-Host "  [setup] Installing frontend dependencies..." -ForegroundColor Gray
    Push-Location $ROOT; npm install 2>&1 | Out-Null; Pop-Location
}
if (-not (Test-Path (Join-Path $ROOT "backend\node_modules"))) {
    Write-Host "  [setup] Installing backend dependencies..." -ForegroundColor Gray
    Push-Location (Join-Path $ROOT "backend"); npm install 2>&1 | Out-Null; Pop-Location
}

# 5. Ensure backend data directory exists
$dataDir = Join-Path $ROOT "backend\data"
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }

# 6. Start backend as background job
Write-Host "  [1/3] Starting backend on port 3001..." -ForegroundColor Green
$backendJob = Start-Job -Name "SB-Backend" -ScriptBlock {
    param($root)
    Set-Location "$root\backend"
    npm run dev 2>&1
} -ArgumentList $ROOT

Start-Sleep -Seconds 2

# 7. Start frontend as background job
Write-Host "  [2/3] Starting frontend (Vite) on port 5173..." -ForegroundColor Green
$frontendJob = Start-Job -Name "SB-Frontend" -ScriptBlock {
    param($root)
    Set-Location $root
    npm run dev 2>&1
} -ArgumentList $ROOT

Start-Sleep -Seconds 3

# 8. Start ngrok as background job
if (-not $skipNgrok) {
    Write-Host "  [3/3] Starting ngrok tunnel to localhost:3001..." -ForegroundColor Green
    $ngrokJob = Start-Job -Name "SB-Ngrok" -ScriptBlock {
        ngrok http 3001 2>&1
    }
    Start-Sleep -Seconds 3
} else {
    Write-Host "  [3/3] Skipping ngrok (not installed)." -ForegroundColor Yellow
}

# Done
Write-Host ""
Write-Host "  [OK] All services running in the background." -ForegroundColor Green
Write-Host ""
Write-Host "  App      :  http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend  :  http://localhost:3001/health" -ForegroundColor Cyan
if (-not $skipNgrok) {
    Write-Host "  ngrok UI :  http://127.0.0.1:4040  (find your public webhook URL here)" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "  Useful commands:" -ForegroundColor Gray
Write-Host "    Get-Job              -- list running jobs" -ForegroundColor Gray
Write-Host "    Receive-Job -Name SB-Backend -Keep   -- view backend output" -ForegroundColor Gray
Write-Host "    Receive-Job -Name SB-Frontend -Keep  -- view frontend output" -ForegroundColor Gray
Write-Host "    Stop-Job -Name SB-Backend,SB-Frontend,SB-Ngrok  -- stop all" -ForegroundColor Gray
Write-Host ""
Write-Host "  Press Ctrl+C to stop watching (services keep running). To stop all:" -ForegroundColor Yellow
Write-Host "    Stop-Job -Name SB-Backend,SB-Frontend,SB-Ngrok" -ForegroundColor Yellow
Write-Host ""
