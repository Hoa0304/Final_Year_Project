# Script to create .env files from .env.example
# Run: powershell -ExecutionPolicy Bypass -File scripts\create-env.ps1

Write-Host "🔧 Creating .env files..." -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $PSScriptRoot

# Backend .env
$backendEnvExample = Join-Path $rootDir "backend\.env.example"
$backendEnv = Join-Path $rootDir "backend\.env"

if (Test-Path $backendEnv) {
    Write-Host "⚠️  backend/.env already exists, skipping..." -ForegroundColor Yellow
} else {
    if (Test-Path $backendEnvExample) {
        Copy-Item $backendEnvExample $backendEnv
        Write-Host "✅ Created backend/.env" -ForegroundColor Green
        Write-Host "   ⚠️  Please edit backend/.env and add your Supabase credentials" -ForegroundColor Yellow
    } else {
        Write-Host "❌ backend/.env.example not found" -ForegroundColor Red
    }
}

# Frontend .env
$frontendEnvExample = Join-Path $rootDir "frontend\.env.example"
$frontendEnv = Join-Path $rootDir "frontend\.env"

if (Test-Path $frontendEnv) {
    Write-Host "⚠️  frontend/.env already exists, skipping..." -ForegroundColor Yellow
} else {
    if (Test-Path $frontendEnvExample) {
        Copy-Item $frontendEnvExample $frontendEnv
        Write-Host "✅ Created frontend/.env" -ForegroundColor Green
        Write-Host "   ⚠️  Please edit frontend/.env and add your API URLs" -ForegroundColor Yellow
    } else {
        Write-Host "❌ frontend/.env.example not found" -ForegroundColor Red
    }
}

# AI Service .env
$aiEnvExample = Join-Path $rootDir "ai-service\.env.example"
$aiEnv = Join-Path $rootDir "ai-service\.env"

if (Test-Path $aiEnv) {
    Write-Host "⚠️  ai-service/.env already exists, skipping..." -ForegroundColor Yellow
} else {
    if (Test-Path $aiEnvExample) {
        Copy-Item $aiEnvExample $aiEnv
        Write-Host "✅ Created ai-service/.env" -ForegroundColor Green
    } else {
        Write-Host "❌ ai-service/.env.example not found" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Start Supabase: cd supabase && npx supabase start" -ForegroundColor White
Write-Host "2. Copy Supabase credentials from output" -ForegroundColor White
Write-Host "3. Edit backend/.env and frontend/.env with your credentials" -ForegroundColor White
Write-Host "4. See ENV_SETUP.md for details" -ForegroundColor White


