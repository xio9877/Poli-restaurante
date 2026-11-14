<#
.SYNOPSIS
    Builds and runs the Poli Restaurante backend and frontend.

.DESCRIPTION
    Starts the backend on port 3000 and the Vite frontend on port 5173.
    Existing listeners are left untouched; the script reports a clear error
    instead of terminating processes it did not start.
#>

param(
    [switch]$NoBuild,
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$frontendRoot = Join-Path $projectRoot 'frontend'
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$backendProcess = $null
$frontendProcess = $null
$runId = [guid]::NewGuid().ToString('N')
$backendStdout = Join-Path $env:TEMP "poli-restaurante-$runId-backend.out.log"
$backendStderr = Join-Path $env:TEMP "poli-restaurante-$runId-backend.err.log"
$frontendStdout = Join-Path $env:TEMP "poli-restaurante-$runId-frontend.out.log"
$frontendStderr = Join-Path $env:TEMP "poli-restaurante-$runId-frontend.err.log"

function Assert-PortAvailable([int]$Port) {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($listener) {
        throw "Port $Port is already in use by PID $($listener.OwningProcess). Stop that service or choose another port before starting this project."
    }
}

function Wait-ForHttp([string]$Name, [string]$Uri, [System.Diagnostics.Process]$Process, [int]$TimeoutSeconds) {
    for ($attempt = 0; $attempt -lt $TimeoutSeconds; $attempt++) {
        if ($Process -and $Process.HasExited) {
            throw "$Name exited with code $($Process.ExitCode) before becoming ready."
        }

        try {
            $response = Invoke-WebRequest -Uri $Uri -Method Get -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host "$Name is responding at $Uri" -ForegroundColor Green
                return
            }
        }
        catch {
            Start-Sleep -Seconds 1
        }
    }

    throw "$Name did not respond at $Uri within $TimeoutSeconds seconds."
}

function Show-StartupLogs {
    foreach ($logPath in @($backendStdout, $backendStderr, $frontendStdout, $frontendStderr)) {
        if (Test-Path $logPath) {
            Write-Host "`n--- $logPath ---" -ForegroundColor Yellow
            Get-Content $logPath -Tail 60
        }
    }
}

function Stop-OwnedProcess([System.Diagnostics.Process]$Process, [string]$Name) {
    if ($Process -and -not $Process.HasExited) {
        Write-Host "Stopping $Name (PID $($Process.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        $Process.WaitForExit(5000)
    }
}

try {
    Write-Host '============================================================' -ForegroundColor Green
    Write-Host '        Poli Restaurante - Dev Environment' -ForegroundColor Green
    Write-Host '============================================================' -ForegroundColor Green

    if (-not $FrontendOnly) { Assert-PortAvailable 3000 }
    if (-not $BackendOnly) { Assert-PortAvailable 5173 }

    Set-Location $projectRoot
    if (-not $NoBuild) {
        Write-Host 'Building backend...' -ForegroundColor Cyan
        npm run build
        if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }

        Write-Host 'Building frontend...' -ForegroundColor Cyan
        Push-Location $frontendRoot
        try {
            npm run build
            if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
        }
        finally {
            Pop-Location
        }
    }

    if (-not $FrontendOnly) {
        $backendEntry = Join-Path $projectRoot 'dist\main.js'
        if (-not (Test-Path $backendEntry)) {
            throw "Backend entry point not found at $backendEntry. Run without -NoBuild to build first."
        }

        Write-Host 'Starting backend...' -ForegroundColor Cyan
        $previousNodeEnv = $env:NODE_ENV
        $previousPort = $env:PORT
        try {
            $env:NODE_ENV = 'development'
            $env:PORT = '3000'
            $backendProcess = Start-Process -FilePath $nodePath -ArgumentList @($backendEntry) `
                -PassThru -WorkingDirectory $projectRoot `
                -RedirectStandardOutput $backendStdout -RedirectStandardError $backendStderr
        }
        finally {
            $env:NODE_ENV = $previousNodeEnv
            $env:PORT = $previousPort
        }
        Wait-ForHttp 'Backend' 'http://127.0.0.1:3000/health' $backendProcess 30
    }

    if (-not $BackendOnly) {
        $viteEntry = Join-Path $frontendRoot 'node_modules\vite\bin\vite.js'
        if (-not (Test-Path $viteEntry)) {
            throw "Vite entry point not found at $viteEntry. Install frontend dependencies first."
        }

        Write-Host 'Starting frontend...' -ForegroundColor Cyan
        $frontendProcess = Start-Process -FilePath $nodePath `
            -ArgumentList @($viteEntry, '--host', '0.0.0.0', '--port', '5173', '--strictPort') `
            -PassThru -WorkingDirectory $frontendRoot `
            -RedirectStandardOutput $frontendStdout -RedirectStandardError $frontendStderr
        Wait-ForHttp 'Frontend' 'http://127.0.0.1:5173/' $frontendProcess 30
        if ($backendProcess) {
            Wait-ForHttp 'Frontend page proxy' 'http://127.0.0.1:5173/pages/orders.html' $frontendProcess 10
        }
    }

    Write-Host "`nPoli Restaurante is running." -ForegroundColor Green
    if (-not $FrontendOnly) {
        Write-Host 'Backend:  http://localhost:3000'
        Write-Host 'Swagger:  http://localhost:3000/api'
        Write-Host 'Health:   http://localhost:3000/health'
    }
    if (-not $BackendOnly) {
        Write-Host 'Frontend: http://localhost:5173'
        Write-Host 'Login:    http://localhost:5173/login'
    }
    Write-Host 'Press Ctrl+C to stop the services started by this script.' -ForegroundColor Gray

    while ($true) {
        Start-Sleep -Seconds 1
        if ($backendProcess -and $backendProcess.HasExited) {
            throw "Backend exited with code $($backendProcess.ExitCode)."
        }
        if ($frontendProcess -and $frontendProcess.HasExited) {
            throw "Frontend exited with code $($frontendProcess.ExitCode)."
        }
    }
}
catch {
    Write-Host "`nStartup/runtime error: $($_.Exception.Message)" -ForegroundColor Red
    Show-StartupLogs
    exit 1
}
finally {
    Stop-OwnedProcess $frontendProcess 'frontend'
    Stop-OwnedProcess $backendProcess 'backend'
}
