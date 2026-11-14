<#
.SYNOPSIS
    Starts the Poli Restaurante frontend server (Vite on port 5173)

.DESCRIPTION
    Starts the Vite dev server with proper proxy configuration.
    Checks if port 5173 is available and kills any existing process.
#>

param(
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$frontendDir = Join-Path $projectRoot "frontend"

Write-Host "Starting Poli Restaurante Frontend..." -ForegroundColor Green

# Kill existing process on port 5173
$process = Get-Process -Id (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "Killing existing process on port 5173 (PID: $($process.Id))" -ForegroundColor Yellow
    Stop-Process -Id $process.Id -Force
    Start-Sleep -Seconds 1
}

# Change to frontend directory
Set-Location $frontendDir

# Build if not skipped
if (-not $NoBuild) {
    Write-Host "Building frontend..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed!"
        exit 1
    }
}

# Start frontend
Write-Host "Starting frontend on http://localhost:5173" -ForegroundColor Green
Write-Host ""

$frontendProcess = Start-Process -FilePath $env:ComSpec -ArgumentList "/d", "/c", "npm.cmd run dev" -PassThru -WorkingDirectory $frontendDir

Write-Host "Frontend started (PID: $($frontendProcess.Id))" -ForegroundColor Green
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Login:    http://localhost:5173/login" -ForegroundColor Cyan
Write-Host ""

# Wait for process to exit
try {
    $frontendProcess.WaitForExit()
}
catch {
    Write-Host ""
    Write-Host "Stopping frontend..." -ForegroundColor Yellow
    Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
}

Write-Host "Frontend stopped" -ForegroundColor Green