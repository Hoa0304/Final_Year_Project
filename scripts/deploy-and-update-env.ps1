# PowerShell script to deploy contracts and update .env automatically
# Usage: .\scripts\deploy-and-update-env.ps1

Write-Host "[START] Deploying HMall Blockchain Contracts..." -ForegroundColor Cyan
Write-Host ""

# Check if Hardhat node is running
Write-Host "[1/4] Checking if Hardhat node is running..." -ForegroundColor Yellow

# First check if port is listening
$portListening = $false
try {
    $listener = Get-NetTCPConnection -LocalPort 8545 -ErrorAction SilentlyContinue
    if ($listener) {
        $portListening = $true
        Write-Host "   [INFO] Port 8545 is listening" -ForegroundColor Cyan
    }
} catch {
    # Ignore if Get-NetTCPConnection not available
}

# Try to connect to Hardhat node
try {
    $body = @{
        jsonrpc = "2.0"
        method = "eth_blockNumber"
        params = @()
        id = 1
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:8545" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5
    if ($response.result) {
        $blockNumber = [Convert]::ToInt32($response.result, 16)
        Write-Host "   [OK] Hardhat node is running (Block: $blockNumber)" -ForegroundColor Green
    } else {
        throw "Invalid response from node"
    }
} catch {
    Write-Host "   [ERROR] Cannot connect to Hardhat node!" -ForegroundColor Red
    if ($portListening) {
        Write-Host "   [WARN] Port 8545 is listening but node is not responding" -ForegroundColor Yellow
    } else {
        Write-Host "   [WARN] Port 8545 is not listening" -ForegroundColor Yellow
    }
    Write-Host "   [ERROR] Details: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   [TIP] Please start Hardhat node first:" -ForegroundColor Yellow
    Write-Host "      cd blockchain" -ForegroundColor Yellow
    Write-Host "      npm run node" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   [TIP] Or if node is running, check:" -ForegroundColor Yellow
    Write-Host "      - Is it running on port 8545?" -ForegroundColor Yellow
    Write-Host "      - Check firewall settings" -ForegroundColor Yellow
    exit 1
}

# Deploy contracts
Write-Host ""
Write-Host "[2/4] Deploying contracts..." -ForegroundColor Yellow
Set-Location blockchain

$deployOutput = npm run deploy:local 2>&1 | Out-String

# Extract addresses from output
$tokenAddress = ""
$registryAddress = ""
$taskSystemAddress = ""

if ($deployOutput -match "HMallToken deployed to:\s*(0x[a-fA-F0-9]{40})") {
    $tokenAddress = $matches[1]
    Write-Host "   [OK] Token: $tokenAddress" -ForegroundColor Green
}

if ($deployOutput -match "TransactionRegistry deployed to:\s*(0x[a-fA-F0-9]{40})") {
    $registryAddress = $matches[1]
    Write-Host "   [OK] Registry: $registryAddress" -ForegroundColor Green
}

if ($deployOutput -match "TaskRewardSystem deployed to:\s*(0x[a-fA-F0-9]{40})") {
    $taskSystemAddress = $matches[1]
    Write-Host "   [OK] Task System: $taskSystemAddress" -ForegroundColor Green
}

Set-Location ..

if (-not $tokenAddress -or -not $registryAddress -or -not $taskSystemAddress) {
    Write-Host ""
    Write-Host "[ERROR] Failed to extract contract addresses from deployment output" -ForegroundColor Red
    Write-Host "   Please deploy manually and update .env:" -ForegroundColor Yellow
    Write-Host "   cd blockchain && npm run deploy:local" -ForegroundColor Yellow
    exit 1
}

# Get private key from Hardhat (first account)
Write-Host ""
Write-Host "[3/4] Getting private key from Hardhat..." -ForegroundColor Yellow
$privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" # Default Hardhat account #0

# Update .env file
Write-Host ""
Write-Host "[4/4] Updating backend/.env..." -ForegroundColor Yellow

$envPath = "backend\.env"

if (-not (Test-Path $envPath)) {
    Write-Host "   [WARN] .env file not found, creating new one..." -ForegroundColor Yellow
    New-Item -Path $envPath -ItemType File -Force | Out-Null
}

# Read current .env
$envContent = Get-Content $envPath -Raw

# Update or add blockchain config
$blockchainConfig = @"
# Blockchain Configuration
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_TOKEN_ADDRESS=$tokenAddress
BLOCKCHAIN_REGISTRY_ADDRESS=$registryAddress
BLOCKCHAIN_TASK_SYSTEM_ADDRESS=$taskSystemAddress
BLOCKCHAIN_PRIVATE_KEY=$privateKey
"@

# Remove old blockchain config if exists
$envContent = $envContent -replace "(?m)^BLOCKCHAIN_.*$", ""
$envContent = $envContent -replace "(?m)^# Blockchain Configuration.*$", ""

# Add new blockchain config
if ($envContent -notmatch "BLOCKCHAIN_RPC_URL") {
    $envContent += "`n$blockchainConfig"
} else {
    # Replace existing
    $lines = $envContent -split "`n"
    $newLines = @()
    $skipBlockchain = $false
    
    foreach ($line in $lines) {
        if ($line -match "^BLOCKCHAIN_") {
            if (-not $skipBlockchain) {
                $newLines += $blockchainConfig -split "`n"
                $skipBlockchain = $true
            }
        } elseif ($line -match "^# Blockchain") {
            $skipBlockchain = $false
            $newLines += $blockchainConfig -split "`n"
            $skipBlockchain = $true
        } elseif (-not $skipBlockchain) {
            $newLines += $line
        }
    }
    
    if (-not $skipBlockchain) {
        $newLines += $blockchainConfig -split "`n"
    }
    
    $envContent = $newLines -join "`n"
}

# Write back to file
$envContent | Set-Content $envPath -NoNewline

Write-Host "   [OK] Updated backend/.env with contract addresses" -ForegroundColor Green

Write-Host ""
Write-Host "[OK] Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Contract Addresses:" -ForegroundColor Cyan
Write-Host "   Token: $tokenAddress" -ForegroundColor White
Write-Host "   Registry: $registryAddress" -ForegroundColor White
Write-Host "   Task System: $taskSystemAddress" -ForegroundColor White
Write-Host ""
Write-Host "[TIP] Next steps:" -ForegroundColor Yellow
Write-Host "   1. Restart backend: cd backend && npm run dev" -ForegroundColor White
Write-Host "   2. Test: npm run test:blockchain" -ForegroundColor White
Write-Host "   3. Sync balances: npm run sync:balances" -ForegroundColor White


