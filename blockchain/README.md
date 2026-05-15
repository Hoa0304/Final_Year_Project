# HMall Blockchain System

Hệ thống blockchain cho HMall sử dụng Hardhat và local blockchain network (miễn phí, không cần phí gas).

## Kiến trúc

### Smart Contracts

1. **HMallToken.sol**: ERC20 token đại diện cho virtual coins
   - Mint/Burn tokens
   - Transfer tokens
   - Authorized minters (backend service)

2. **TransactionRegistry.sol**: Registry ghi lại tất cả giao dịch
   - Immutable transaction history
   - Audit trail
   - User transaction tracking

3. **TaskRewardSystem.sol**: Quản lý task rewards
   - Prevent double-claiming
   - Task completion tracking
   - Reward distribution

## Setup

### 1. Cài đặt dependencies

```bash
cd blockchain
npm install
```

### 2. Compile contracts

```bash
npm run compile
```

### 3. Start local blockchain node

```bash
npm run node
```

Giữ terminal này chạy. Node sẽ chạy tại `http://localhost:8545`

### 4. Deploy contracts (terminal mới)

```bash
npm run deploy:local
```

Lưu lại các địa chỉ contract được in ra.

### 5. Cấu hình backend

Thêm vào `backend/.env`:

```env
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_TOKEN_ADDRESS=<token_address>
BLOCKCHAIN_REGISTRY_ADDRESS=<registry_address>
BLOCKCHAIN_TASK_SYSTEM_ADDRESS=<task_system_address>
BLOCKCHAIN_PRIVATE_KEY=<backend_wallet_private_key>
```

**Lưu ý**: Lấy private key từ Hardhat node output (khi chạy `npm run node`)

## Testing

```bash
npm test
```

## Network Configuration

- **Chain ID**: 1337
- **RPC URL**: http://localhost:8545
- **Currency**: ETH (testnet, không có giá trị thực)

## Security Notes

- Local blockchain chỉ dùng cho development
- Production cần deploy lên testnet/mainnet
- Private keys phải được bảo mật
- Không commit private keys vào git






