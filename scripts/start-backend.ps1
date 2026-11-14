<#
.SYNOPSIS
    Starts the Poli Restaurante backend server (NestJS on port 3000)

.DESCRIPTION
    Starts the NestJS backend server with proper environment loading.
    Checks if port 3000 is available and kills any existing process.
#>

param(
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent

Write-Host "Starting Poli Restaurante Backend..." -ForegroundColor Green

# Kill existing process on port 3000
$process = Get-Process -Id (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "Killing existing process on port 3000 (PID: $($process.Id))" -ForegroundColor Yellow
    Stop-Process -Id $process.Id -Force
    Start-Sleep -Seconds 1
}

# Change to project root
Set-Location $projectRoot

# Build if not skipped
if (-not $NoBuild) {
    Write-Host "Building backend..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed!"
        exit 1
    }
}

# Start backend
Write-Host "Starting backend on http://localhost:3000" -ForegroundColor Green
Write-Host "   Swagger: http://localhost:3000/api" -ForegroundColor Cyan
Write-Host "   Health:  http://localhost:3000/health" -ForegroundColor Cyan
Write-Host ""

# Start the backend process
$backendProcess = Start-Process node -ArgumentList "dist/main.js" -PassThru -WorkingDirectory $projectRoot

Write-Host "Backend started (PID: $($backendProcess.Id))" -ForegroundColor Green
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray

# Wait for process to exit
try {
    $backendProcess.WaitForExit()
}
catch {
    Write-Host ""
    Write-Host "Stopping backend..." -ForegroundColor Yellow
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
}

Write-Host "Backend stopped" -ForegroundColor Green