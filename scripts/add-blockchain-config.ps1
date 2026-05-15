# Script to add blockchain configuration to backend/.env
# Usage: .\scripts\add-blockchain-config.ps1

$envFile = "backend\.env"

# Check if .env exists
if (-not (Test-Path $envFile)) {
    Write-Host "[ERROR] File $envFile not found!" -ForegroundColor Red
    Write-Host "   Please create backend/.env first" -ForegroundColor Yellow
    exit 1
}

# Contract addresses from deployment (update these after deploying)
$contractAddresses = @{
    TOKEN = "0x5fbdb2315678afecb367f032d93f642f64180aa3"
    REGISTRY = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512"
    TASK_SYSTEM = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0"
}

# Private key from Account #0 (deployer account)
$privateKey = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

# RPC URL
$rpcUrl = "http://localhost:8545"

Write-Host ""
Write-Host "[INFO] Adding blockchain configuration to $envFile..." -ForegroundColor Cyan

# Read current .env content
$content = Get-Content $envFile -Raw

# Check if blockchain config already exists
if ($content -match "BLOCKCHAIN_") {
    Write-Host "[WARN] Blockchain configuration already exists in .env" -ForegroundColor Yellow
    $overwrite = Read-Host "   Do you want to overwrite? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "   Skipped. Exiting." -ForegroundColor Yellow
        exit 0
    }
    # Remove existing blockchain config
    $content = $content -replace "(?m)^BLOCKCHAIN_.*$\r?\n", ""
}

# Add blockchain configuration
$blockchainConfig = @"

# Blockchain Configuration (Local Hardhat Network)
BLOCKCHAIN_RPC_URL=$rpcUrl
BLOCKCHAIN_TOKEN_ADDRESS=$($contractAddresses.TOKEN)
BLOCKCHAIN_REGISTRY_ADDRESS=$($contractAddresses.REGISTRY)
BLOCKCHAIN_TASK_SYSTEM_ADDRESS=$($contractAddresses.TASK_SYSTEM)
BLOCKCHAIN_PRIVATE_KEY=$privateKey
"@

# Append blockchain config
$content += "`n$blockchainConfig"

# Write back to file
Set-Content -Path $envFile -Value $content -NoNewline

Write-Host "[OK] Blockchain configuration added successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Configuration added:" -ForegroundColor Cyan
Write-Host "   RPC URL: $rpcUrl" -ForegroundColor White
Write-Host "   Token Address: $($contractAddresses.TOKEN)" -ForegroundColor White
Write-Host "   Registry Address: $($contractAddresses.REGISTRY)" -ForegroundColor White
Write-Host "   Task System Address: $($contractAddresses.TASK_SYSTEM)" -ForegroundColor White
Write-Host "   Private Key: $($privateKey.Substring(0, 10))..." -ForegroundColor White
Write-Host ""
Write-Host "[WARN] Make sure Hardhat node is running on $rpcUrl" -ForegroundColor Yellow
Write-Host "   Run: cd blockchain && npm run node" -ForegroundColor Yellow
Write-Host ""
Write-Host "[TIP] Restart backend server to apply changes" -ForegroundColor Cyan


