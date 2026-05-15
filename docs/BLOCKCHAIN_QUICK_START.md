# Blockchain Quick Start Guide

Hướng dẫn nhanh để setup blockchain cho HMall.

## Bước 1: Deploy Smart Contracts

### Terminal 1: Start Hardhat Node
```powershell
cd blockchain
npm install
npm run compile
npm run node
```

**Giữ terminal này chạy!** Copy các contract addresses và private key từ output.

### Terminal 2: Deploy Contracts
```powershell
cd blockchain
npm run deploy:local
```

Output sẽ hiển thị:
```
HMallToken deployed to: 0x5fbdb2315678afecb367f032d93f642f64180aa3
TransactionRegistry deployed to: 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512
TaskRewardSystem deployed to: 0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0
```

## Bước 2: Cấu hình Backend

### Cách 1: Dùng Script (Khuyến nghị)

```powershell
.\scripts\add-blockchain-config.ps1
```

Script sẽ tự động thêm blockchain config vào `backend/.env`.

### Cách 2: Thêm thủ công

Mở `backend/.env` và thêm:

```env
# Blockchain Configuration (Local Hardhat Network)
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_TOKEN_ADDRESS=0x5fbdb2315678afecb367f032d93f642f64180aa3
BLOCKCHAIN_REGISTRY_ADDRESS=0xe7f1725e7734ce288f8367e1bb143e90bb3f0512
BLOCKCHAIN_TASK_SYSTEM_ADDRESS=0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0
BLOCKCHAIN_PRIVATE_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Lưu ý**: 
- Thay các addresses bằng addresses từ deploy output của bạn
- Private key là của Account #0 (deployer account), bỏ prefix `0x`

## Bước 3: Cài đặt Dependencies

```powershell
cd backend
npm install
```

Sẽ cài `ethers` package.

## Bước 4: Restart Backend

```powershell
cd backend
npm run build
npm run dev
```

## Bước 5: Kiểm tra

### Test API Endpoint

```powershell
# Kiểm tra blockchain status
curl http://localhost:3002/api/blockchain/status
```

Response:
```json
{
  "enabled": true,
  "message": "Blockchain is enabled and configured"
}
```

### Test với Authentication

```powershell
# Login để lấy token
$token = (Invoke-RestMethod -Uri "http://localhost:3002/api/auth/login" -Method POST -Body (@{
    email = "user@example.com"
    password = "password"
} | ConvertTo-Json) -ContentType "application/json").token

# Get blockchain address
Invoke-RestMethod -Uri "http://localhost:3002/api/blockchain/address" -Headers @{
    Authorization = "Bearer $token"
}

# Get token balance
Invoke-RestMethod -Uri "http://localhost:3002/api/blockchain/balance" -Headers @{
    Authorization = "Bearer $token"
}
```

## Troubleshooting

### Lỗi: "Blockchain is not enabled"

- Kiểm tra `backend/.env` có đầy đủ blockchain config
- Kiểm tra Hardhat node đang chạy: `curl http://localhost:8545`
- Restart backend server

### Lỗi: "Failed to mint tokens"

- Kiểm tra account có được authorize làm minter
- Kiểm tra private key đúng
- Kiểm tra contract address đúng

### Lỗi: "Connection refused"

- Hardhat node chưa chạy
- Chạy: `cd blockchain && npm run node`

## Next Steps

- Xem [BLOCKCHAIN_SETUP.md](./BLOCKCHAIN_SETUP.md) để biết chi tiết
- Test các API endpoints khác
- Xem transaction history trên blockchain






