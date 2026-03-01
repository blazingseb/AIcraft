$ErrorActionPreference = "Stop"

Set-Location -Path $PSScriptRoot

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js + npm are required. Install LTS from https://nodejs.org/ and rerun this script." -ForegroundColor Red
    exit 1
}

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Building Windows executables (installer + portable)..." -ForegroundColor Cyan
npm run dist:win
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Build complete. Check the .\\dist folder." -ForegroundColor Green
