# HMall Blockchain Integration Guide

Hướng dẫn thiết lập và sử dụng hệ thống blockchain cho HMall.

## Tổng quan

HMall đã được tích hợp blockchain để:
- **Ghi lại tất cả giao dịch** một cách bất biến (immutable)
- **Quản lý virtual currency** trên blockchain
- **Ngăn chặn double-claiming** task rewards
- **Audit trail** đầy đủ cho tất cả transactions

## Kiến trúc

### Smart Contracts

1. **HMallToken.sol**: ERC20 token đại diện cho virtual coins
2. **TransactionRegistry.sol**: Registry ghi lại tất cả giao dịch
3. **TaskRewardSystem.sol**: Quản lý task rewards và ngăn double-claiming

### Blockchain Network

- **Local Blockchain**: Hardhat local network (miễn phí, không cần phí gas)
- **Chain ID**: 1337
- **RPC URL**: http://localhost:8545

## Setup

### 1. Cài đặt Blockchain Dependencies

```bash
cd blockchain
npm install
```

### 2. Compile Smart Contracts

```bash
npm run compile
```

### 3. Start Local Blockchain Node

Trong một terminal riêng:

```bash
cd blockchain
npm run node
```

Giữ terminal này chạy. Node sẽ chạy tại `http://localhost:8545` và in ra danh sách accounts với private keys.

**Lưu ý**: Copy một private key từ output để dùng cho backend service.

### 4. Deploy Smart Contracts

Trong terminal mới:

```bash
cd blockchain
npm run deploy:local
```

Output sẽ hiển thị các địa chỉ contract. Lưu lại các địa chỉ này.

### 5. Cấu hình Backend

Thêm vào `backend/.env`:

```env
# Blockchain Configuration
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_TOKEN_ADDRESS=<token_address_from_deploy>
BLOCKCHAIN_REGISTRY_ADDRESS=<registry_address_from_deploy>
BLOCKCHAIN_TASK_SYSTEM_ADDRESS=<task_system_address_from_deploy>
BLOCKCHAIN_PRIVATE_KEY=<private_key_from_hardhat_node>
```

**Lưu ý**: 
- `BLOCKCHAIN_PRIVATE_KEY` là private key của một account từ Hardhat node (không có `0x` prefix)
- Account này sẽ được authorize làm minter cho token contract

### 6. Cài đặt Backend Dependencies

```bash
cd backend
npm install
```

### 7. Build và Start Backend

```bash
cd backend
npm run build
npm run dev
```

## Sử dụng

### API Endpoints

#### 1. Kiểm tra trạng thái blockchain

```http
GET /api/blockchain/status
```

Response:
```json
{
  "enabled": true,
  "message": "Blockchain is enabled and configured"
}
```

#### 2. Lấy địa chỉ blockchain của user

```http
GET /api/blockchain/address
Authorization: Bearer <token>
```

Response:
```json
{
  "userId": "user-uuid",
  "address": "0x...",
  "message": "Blockchain address generated from user ID"
}
```

#### 3. Lấy token balance trên blockchain

```http
GET /api/blockchain/balance
Authorization: Bearer <token>
```

Response:
```json
{
  "userId": "user-uuid",
  "address": "0x...",
  "balance": 1000.5,
  "message": "Token balance retrieved from blockchain"
}
```

#### 4. Lấy danh sách transaction IDs trên blockchain

```http
GET /api/blockchain/transactions
Authorization: Bearer <token>
```

Response:
```json
{
  "userId": "user-uuid",
  "address": "0x...",
  "transactionIds": [1, 2, 3, ...],
  "count": 10,
  "message": "User transaction IDs retrieved from blockchain"
}
```

#### 5. Lấy chi tiết transaction từ blockchain

```http
GET /api/blockchain/transactions/:txId
```

Response:
```json
{
  "transaction": {
    "id": 1,
    "user": "0x...",
    "transactionType": "earn",
    "amount": 100.0,
    "balanceBefore": 1000.0,
    "balanceAfter": 1100.0,
    "description": "Task reward",
    "referenceId": "0x...",
    "referenceType": "task",
    "createdBy": "0x0000...",
    "timestamp": 1234567890
  },
  "message": "Transaction retrieved from blockchain"
}
```

## Tích hợp tự động

Khi blockchain được enable, hệ thống sẽ tự động:

1. **Ghi lại tất cả transactions** lên blockchain khi:
   - User earn/spend coins
   - Admin grant/revoke coins
   - Task rewards
   - Stock profits/losses

2. **Mint/Burn tokens** trên blockchain tương ứng với database balance

3. **Ngăn double-claiming** task rewards bằng cách check trên blockchain trước khi claim

## Workflow

### Transaction Flow

```
User Action
    ↓
Backend Service
    ↓
Database Transaction (ACID)
    ↓
Blockchain Registration (nếu enabled)
    ↓
Token Mint/Burn (nếu enabled)
    ↓
Response to User
```

### Task Reward Flow

```
User Completes Task
    ↓
Validate Requirements
    ↓
Check Blockchain (prevent double-claim)
    ↓
Claim on Blockchain
    ↓
Create Database Transaction
    ↓
Mint Tokens
    ↓
Send Notification
```

## Troubleshooting

### Blockchain không hoạt động

1. Kiểm tra Hardhat node đang chạy:
   ```bash
   curl http://localhost:8545
   ```

2. Kiểm tra `.env` có đầy đủ config:
   - `BLOCKCHAIN_RPC_URL`
   - `BLOCKCHAIN_TOKEN_ADDRESS`
   - `BLOCKCHAIN_REGISTRY_ADDRESS`
   - `BLOCKCHAIN_TASK_SYSTEM_ADDRESS`
   - `BLOCKCHAIN_PRIVATE_KEY`

3. Kiểm tra account có được authorize làm minter:
   - Xem trong deploy script output
   - Hoặc check contract: `token.setMinter(backendAddress, true)`

### Transaction không được ghi lên blockchain

- Kiểm tra logs trong backend console
- Lỗi blockchain sẽ không làm fail database transaction (graceful degradation)
- Database transaction vẫn được commit, chỉ blockchain registration bị skip

### Token balance không khớp

- Database balance là source of truth
- Blockchain balance chỉ là mirror
- Nếu không khớp, có thể do blockchain transaction failed nhưng database đã commit

## Production Considerations

### Hiện tại (Development)

- Local blockchain (Hardhat)
- Miễn phí, không cần phí gas
- Chỉ dùng cho development/testing

### Production Options

1. **Testnet**: Deploy lên Sepolia, Mumbai, etc.
   - Miễn phí
   - Cần phí gas (testnet tokens)
   - Public, có thể verify

2. **Mainnet**: Deploy lên Ethereum, Polygon, etc.
   - Cần phí gas thật
   - Immutable, public
   - Production-ready

3. **Private Blockchain**: Hyperledger Fabric, Quorum
   - Private, permissioned
   - Không cần phí gas
   - Phức tạp hơn để setup

## Security Notes

- ⚠️ **KHÔNG commit private keys vào git**
- ⚠️ **Local blockchain chỉ dùng cho development**
- ⚠️ **Production cần deploy lên testnet/mainnet**
- ✅ **Database vẫn là source of truth**
- ✅ **Blockchain chỉ là audit trail**

## Tài liệu tham khảo

- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)






