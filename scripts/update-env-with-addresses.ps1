# Script to update backend/.env with new contract addresses
param(
    [string]$TokenAddress = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    [string]$RegistryAddress = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
    [string]$TaskSystemAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
    [string]$PrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
)

$envPath = "backend\.env"

if (-not (Test-Path $envPath)) {
    Write-Host "[ERROR] File $envPath not found!" -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Updating $envPath with new contract addresses..." -ForegroundColor Cyan

$content = Get-Content $envPath -Raw

$content = $content -replace "(?m)^BLOCKCHAIN_.*$\r?\n", ""
$content = $content -replace "(?m)^# Blockchain.*$\r?\n", ""

$blockchainConfig = "`n# Blockchain Configuration`nBLOCKCHAIN_RPC_URL=http://localhost:8545`nBLOCKCHAIN_TOKEN_ADDRESS=$TokenAddress`nBLOCKCHAIN_REGISTRY_ADDRESS=$RegistryAddress`nBLOCKCHAIN_TASK_SYSTEM_ADDRESS=$TaskSystemAddress`nBLOCKCHAIN_PRIVATE_KEY=$PrivateKey`n"

$content += $blockchainConfig

$content | Set-Content $envPath -NoNewline

Write-Host "[OK] Updated $envPath successfully!" -ForegroundColor Green
Write-Host "[INFO] Token: $TokenAddress" -ForegroundColor White
Write-Host "[INFO] Registry: $RegistryAddress" -ForegroundColor White
Write-Host "[INFO] Task System: $TaskSystemAddress" -ForegroundColor White
Write-Host "[TIP] Next step: Restart backend server" -ForegroundColor Yellow
