# Blockchain Debug Guide - HMall

Hướng dẫn debug khi blockchain không ghi nhận transactions.

---

## 🔍 Vấn Đề: Transactions Không Được Ghi Lên Blockchain

### Triệu Chứng:
- ✅ Database: Transaction được tạo
- ✅ Database: Balance được cập nhật
- ❌ Blockchain: Token balance = 0
- ❌ Blockchain: Không có transactions

---

## 📋 Checklist Debug

### Bước 1: Kiểm Tra Blockchain Configuration

```bash
# Test blockchain config
cd backend
npm run test:blockchain
```

Script sẽ check:
- ✅ Blockchain enabled?
- ✅ RPC connection?
- ✅ Contracts deployed?
- ✅ Addresses correct?

**Nếu fail:**
- Check `.env` file có đầy đủ config không
- Deploy contracts: `cd blockchain && npm run deploy:local`
- Update `.env` với addresses mới

### Bước 2: Kiểm Tra Backend Logs

Khi đăng ký user mới, tìm trong logs:

```
💰 Granting initial balance of 1000 coins to user <user_id>
📝 Creating transaction: userId=<user_id>, type=grant, amount=1000
✅ Transaction created in database: <transaction_id>
🔗 Blockchain enabled, registering transaction on blockchain...
   User address: 0x...
   📍 Registry address: 0x...
   ✅ Registry contract found
   📤 Calling registerTransaction on smart contract...
   ⏳ Waiting for transaction confirmation...
   ✅ Transaction confirmed in block X
   📝 Blockchain transaction ID: 1
   🪙 Minting 1000 tokens to 0x...
   ✅ Tokens minted successfully
✅ Transaction fully registered on blockchain
```

**Nếu thấy lỗi:**
- `⚠️ Blockchain is not enabled` → Check `.env` config
- `❌ Contract does not exist` → Deploy contracts
- `❌ could not decode` → ABI mismatch hoặc contract chưa deploy

### Bước 3: Kiểm Tra Hardhat Node

```bash
# Terminal 1: Start Hardhat node
cd blockchain
npm run node
```

**Phải thấy:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

### Bước 4: Kiểm Tra Contracts Đã Deploy

```bash
# Terminal 2: Deploy contracts
cd blockchain
npm run deploy:local
```

**Phải thấy:**
```
HMallToken deployed to: 0x...
TransactionRegistry deployed to: 0x...
TaskRewardSystem deployed to: 0x...
```

**Copy addresses và update `.env`:**
```env
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
BLOCKCHAIN_REGISTRY_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
BLOCKCHAIN_TASK_SYSTEM_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### Bước 5: Restart Backend

```bash
cd backend
npm run dev
```

**Check logs khi start:**
```
✅ Loaded .env from: ...
```

---

## 🛠️ Quick Fixes

### Fix 1: Blockchain Không Enabled

**Triệu chứng:** Logs hiển thị `⚠️ Blockchain is not enabled`

**Giải pháp:**
1. Check `.env` file có đầy đủ:
   ```env
   BLOCKCHAIN_RPC_URL=http://localhost:8545
   BLOCKCHAIN_TOKEN_ADDRESS=0x...
   BLOCKCHAIN_REGISTRY_ADDRESS=0x...
   BLOCKCHAIN_TASK_SYSTEM_ADDRESS=0x...
   BLOCKCHAIN_PRIVATE_KEY=0x...
   ```

2. Restart backend

### Fix 2: Contract Không Tồn Tại

**Triệu chứng:** `❌ Contract does not exist at address`

**Giải pháp:**
1. Deploy contracts:
   ```bash
   cd blockchain
   npm run deploy:local
   ```

2. Copy addresses và update `.env`

3. Restart backend

### Fix 3: RPC Connection Failed

**Triệu chứng:** `❌ Cannot connect to RPC`

**Giải pháp:**
1. Start Hardhat node:
   ```bash
   cd blockchain
   npm run node
   ```

2. Verify node đang chạy:
   ```bash
   curl http://localhost:8545
   ```

### Fix 4: Token Balance = 0

**Triệu chứng:** Database có balance nhưng blockchain = 0

**Giải pháp:**
1. Sync balances:
   ```bash
   cd backend
   npm run sync:balances
   ```

   Hoặc qua API:
   ```bash
   POST /api/admin/blockchain/sync-balances
   ```

---

## 🧪 Test Scripts

### Test Blockchain Config

```bash
cd backend
npm run test:blockchain
```

**Output mong đợi:**
```
🧪 Testing Blockchain Configuration...

1️⃣ Checking blockchain configuration...
   Blockchain enabled: ✅ YES

2️⃣ Testing RPC connection...
   ✅ Connected to blockchain. Current block: 123

3️⃣ Checking Token Contract...
   ✅ Token contract found at 0x...
   📊 Total supply: 1000000.0 HMall

4️⃣ Checking Registry Contract...
   ✅ Registry contract found at 0x...
   📊 Total transactions: 5

5️⃣ Testing user address generation...
   Test user ID: test-user-id-123
   Generated address: 0x...

6️⃣ Testing balance query...
   ✅ Balance query works. Test address balance: 0 HMall

✅ All blockchain tests passed!
```

### Sync Balances

```bash
cd backend
npm run sync:balances
```

---

## 📊 Debug Commands

### Check Blockchain Status

```bash
# Status
curl http://localhost:3002/api/blockchain/status

# User balance
curl http://localhost:3002/api/blockchain/balance \
  -H "Authorization: Bearer <token>"

# User transactions
curl http://localhost:3002/api/blockchain/transactions \
  -H "Authorization: Bearer <token>"
```

### Check Database Transactions

```sql
-- All transactions
SELECT id, user_id, type, amount, created_at 
FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- User transactions
SELECT * FROM transactions 
WHERE user_id = '<user_id>' 
ORDER BY created_at DESC;
```

### Check Hardhat Node

```bash
# Check if node is running
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## 🎯 Step-by-Step Fix

### Khi Đăng Ký User Mới Không Có Balance Trên Blockchain:

1. **Check logs khi đăng ký:**
   - Tìm: `💰 Granting initial balance...`
   - Tìm: `🔗 Blockchain enabled...`
   - Tìm: `✅ Transaction registered on blockchain...`

2. **Nếu không thấy blockchain logs:**
   ```bash
   # Test blockchain
   npm run test:blockchain
   ```

3. **Nếu test fail:**
   - Deploy contracts
   - Update `.env`
   - Restart backend

4. **Nếu test pass nhưng vẫn không ghi:**
   - Check backend logs chi tiết
   - Có thể có lỗi trong smart contract call
   - Check Hardhat node logs

5. **Sync balances cho users cũ:**
   ```bash
   npm run sync:balances
   ```

---

## 📚 References

- [BLOCKCHAIN_QUICK_START.md](./BLOCKCHAIN_QUICK_START.md) - Quick setup
- [BLOCKCHAIN_TROUBLESHOOTING.md](./BLOCKCHAIN_TROUBLESHOOTING.md) - Troubleshooting
- [test-blockchain.ts](../backend/src/scripts/test-blockchain.ts) - Test script





