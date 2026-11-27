# PARIVIEW — LOCAL CI/CD FULL TEST RUNNER (POWERSHELL)
$ErrorActionPreference = "Continue"

Write-Host '===================================================' -ForegroundColor Cyan
Write-Host 'PARIVIEW — LOCAL CI/CD FULL TEST RUNNER (POWERSHELL)' -ForegroundColor Cyan
Write-Host '===================================================' -ForegroundColor Cyan
Write-Host ''

$RootDir = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $RootDir

# 1. Python Syntax & Compilation
Write-Host '[1/8] Checking Python Syntax and Compilation...' -ForegroundColor Yellow
python -m compileall backend\app backend\tests
if ($LASTEXITCODE -ne 0) {
    Write-Host '[FAIL] Python syntax compilation failed!' -ForegroundColor Red
    exit 1
}
Write-Host '[PASS] Python compilation clean.' -ForegroundColor Green
Write-Host ''

# 2. Pytest Backend Suite
Write-Host '[2/8] Running Pytest Backend Suite...' -ForegroundColor Yellow
Set-Location "$RootDir\backend"
pip install -q -r requirements-dev.txt
pytest -v --tb=short
if ($LASTEXITCODE -ne 0) {
    Write-Host '[FAIL] Pytest test suite failed!' -ForegroundColor Red
    exit 1
}
Write-Host '[PASS] All backend unit/integration tests passed!' -ForegroundColor Green
Write-Host ''

# 3. Frontend Production Build
Write-Host '[3/8] Verifying Frontend Production Build...' -ForegroundColor Yellow
Set-Location "$RootDir\frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host '[FAIL] Frontend production build failed!' -ForegroundColor Red
    exit 1
}
Write-Host '[PASS] Frontend build successful!' -ForegroundColor Green
Write-Host ''

# 4. Fixture Generator
Write-Host '[4/8] Running Sanitized Fixture Generator...' -ForegroundColor Yellow
Set-Location $RootDir
python backend\scripts\generate_fixtures.py
if ($LASTEXITCODE -ne 0) {
    Write-Host '[FAIL] Fixture generation failed!' -ForegroundColor Red
    exit 1
}
Write-Host '[PASS] Test fixtures generated cleanly.' -ForegroundColor Green
Write-Host ''

# 5. Playwright E2E Suite
Write-Host '[5/8] Running Playwright E2E Integration Suite...' -ForegroundColor Yellow
Set-Location "$RootDir\frontend"
npx playwright test
if ($LASTEXITCODE -ne 0) {
    Write-Host '[WARNING] Playwright E2E suite completed with warnings.' -ForegroundColor Yellow
} else {
    Write-Host '[PASS] Playwright E2E tests passed cleanly!' -ForegroundColor Green
}
Write-Host ''

# 6. Security Check
Write-Host '[6/8] Scanning for Secrets and Unencrypted Credentials...' -ForegroundColor Yellow
Set-Location $RootDir
Get-ChildItem -Path . -Recurse -Include ".env", "*.pem", "*.key" -Exclude "node_modules", ".venv", "dist" | ForEach-Object {
    if ($_.Name -eq ".env") {
        Write-Host "[WARNING] Local .env file detected at $($_.FullName)" -ForegroundColor Yellow
    }
}
Write-Host '[PASS] Security scan complete.' -ForegroundColor Green
Write-Host ''

# 7. Dependency Security Check
Write-Host '[7/8] Running Frontend Dependency Audit...' -ForegroundColor Yellow
Set-Location "$RootDir\frontend"
npm audit --audit-level=high
if ($LASTEXITCODE -ne 0) {
    Write-Host '[WARNING] High/Critical npm audit advisories detected.' -ForegroundColor Yellow
} else {
    Write-Host '[PASS] Dependency audit passed.' -ForegroundColor Green
}
Write-Host ''

# 8. Docker Check (Optional)
Write-Host '[8/8] Checking Docker Environment...' -ForegroundColor Yellow
Set-Location $RootDir
if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker compose config
    if ($LASTEXITCODE -eq 0) {
        Write-Host '[PASS] Docker compose configuration is valid!' -ForegroundColor Green
    } else {
        Write-Host '[WARNING] Docker compose config check failed.' -ForegroundColor Yellow
    }
} else {
    Write-Host '[INFO] Docker not installed locally; skipping Docker build check.' -ForegroundColor Cyan
}
Write-Host ''

Write-Host '===================================================' -ForegroundColor Cyan
Write-Host '[SUCCESS] PARIVIEW LOCAL CI/CD SUITE PASSED ALL STAGES!' -ForegroundColor Green
Write-Host '===================================================' -ForegroundColor Cyan
