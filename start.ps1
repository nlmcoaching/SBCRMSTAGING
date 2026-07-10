# Simply Breathe OS -- Dev Startup Script
# Starts: backend (Node/Express), frontend (Vite), ngrok tunnel
# Uses Start-Process so services survive after this shell closes.
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

# 6. Kill any stale processes already bound to these ports (clean restart)
$ports = @(3001, 5173)
foreach ($port in $ports) {
    $pids = netstat -ano 2>$null | Select-String ":$port\s" | ForEach-Object {
        ($_ -split '\s+')[-1]
    } | Where-Object { $_ -match '^\d+$' } | Select-Object -Unique
    foreach ($p in $pids) {
        try { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } catch {}
    }
}
Start-Sleep -Seconds 1

# 7. Start backend as an independent process (survives shell close)
Write-Host "  [1/3] Starting backend on port 3001..." -ForegroundColor Green
$backendLog = Join-Path $ROOT "backend\backend.log"
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c cd /d `"$ROOT\backend`" && npm run dev > `"$backendLog`" 2>&1" `
    -WindowStyle Hidden

Start-Sleep -Seconds 2

# 8. Start frontend as an independent process
Write-Host "  [2/3] Starting frontend (Vite) on port 5173..." -ForegroundColor Green
$frontendLog = Join-Path $ROOT "frontend.log"
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c cd /d `"$ROOT`" && npm run dev > `"$frontendLog`" 2>&1" `
    -WindowStyle Hidden

Start-Sleep -Seconds 3

# 9. Start ngrok as an independent process
if (-not $skipNgrok) {
    # Resolve NODE_ENV from the process env, then backend\.env (if set there).
    $nodeEnv = $env:NODE_ENV
    if (-not $nodeEnv -and (Test-Path $envFile)) {
        $nodeEnvLine = Get-Content $envFile | Where-Object { $_ -match '^\s*NODE_ENV\s*=' } | Select-Object -First 1
        if ($nodeEnvLine) {
            $nodeEnv = ($nodeEnvLine -replace '^\s*NODE_ENV\s*=\s*', '' -replace '^["'']|["'']$', '').Trim()
        }
    }
    if (-not $nodeEnv) { $nodeEnv = "(unset)" }

    if ($nodeEnv -ne "production") {
        Write-Host ""
        Write-Host "  [WARN] About to start ngrok while NODE_ENV=$nodeEnv (not production)." -ForegroundColor Yellow
        Write-Host "         A public tunnel will expose this backend with dev-mode security" -ForegroundColor Yellow
        Write-Host "         (weaker secret checks; unsigned Calendly webhooks only if" -ForegroundColor Yellow
        Write-Host "         ALLOW_UNSIGNED_CALENDLY_WEBHOOKS=true — never enable that with ngrok)." -ForegroundColor Yellow
        Write-Host ""
    }

    Write-Host "  [3/3] Starting ngrok tunnel to localhost:3001..." -ForegroundColor Green
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c ngrok http 3001" `
        -WindowStyle Hidden
    Start-Sleep -Seconds 2
} else {
    Write-Host "  [3/3] Skipping ngrok (not installed)." -ForegroundColor Yellow
}

# Done
Write-Host ""
Write-Host "  [OK] All services running as independent processes." -ForegroundColor Green
Write-Host "       They will keep running even after this shell closes." -ForegroundColor Green
Write-Host ""
Write-Host "  App      :  http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend  :  http://localhost:3001/health" -ForegroundColor Cyan
if (-not $skipNgrok) {
    Write-Host "  ngrok UI :  http://127.0.0.1:4040  (find your public webhook URL here)" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "  Log files:" -ForegroundColor Gray
Write-Host "    Backend  : $backendLog" -ForegroundColor Gray
Write-Host "    Frontend : $frontendLog" -ForegroundColor Gray
Write-Host ""
Write-Host "  To stop all services:" -ForegroundColor Yellow
Write-Host "    Stop-Process -Name node -Force   (stops backend + frontend)" -ForegroundColor Yellow
Write-Host ""
