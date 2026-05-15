# Hướng Dẫn Deploy Contracts và Fix Vấn Đề

Khi Hardhat node restart, contracts sẽ mất. Cần deploy lại và update .env.

---

## 🚀 Quick Fix: Deploy và Update Tự Động

### Cách 1: Dùng Script Tự Động (Khuyến nghị)

```powershell
# PowerShell
.\scripts\deploy-and-update-env.ps1
```

Script sẽ:
1. ✅ Check Hardhat node đang chạy
2. ✅ Deploy contracts
3. ✅ Extract addresses từ output
4. ✅ Tự động update `backend/.env`
5. ✅ Hiển thị addresses

### Cách 2: Deploy Thủ Công

#### Bước 1: Đảm Bảo Hardhat Node Đang Chạy

```bash
# Terminal 1
cd blockchain
npm run node
```

**Phải thấy:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

#### Bước 2: Deploy Contracts

```bash
# Terminal 2 (mới)
cd blockchain
npm run deploy:local
```

**Output sẽ có:**
```
HMallToken deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
TransactionRegistry deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
TaskRewardSystem deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

=== Save these addresses to backend/.env ===
BLOCKCHAIN_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
BLOCKCHAIN_REGISTRY_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
BLOCKCHAIN_TASK_SYSTEM_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

#### Bước 3: Update backend/.env

Mở `backend/.env` và update/copy các addresses:

```env
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
BLOCKCHAIN_REGISTRY_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
BLOCKCHAIN_TASK_SYSTEM_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Lưu ý:** 
- `BLOCKCHAIN_PRIVATE_KEY` là private key của account #0 từ Hardhat node
- Default Hardhat account #0: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

#### Bước 4: Verify

```bash
cd backend
npm run test:blockchain
```

**Phải thấy:**
```
✅ Token contract found at 0x...
✅ Registry contract found at 0x...
✅ All blockchain tests passed!
```

#### Bước 5: Restart Backend

```bash
cd backend
npm run dev
```

---

## ⚠️ Lưu Ý Quan Trọng

### Hardhat Local Node Reset

**Vấn đề:** Mỗi lần restart Hardhat node, blockchain sẽ reset về block 0, contracts sẽ mất.

**Giải pháp:**
1. **Development:** Deploy lại contracts mỗi lần restart node
2. **Production:** Deploy lên testnet/mainnet (không reset)

### Contract Addresses Thay Đổi

**Vấn đề:** Mỗi lần deploy, addresses có thể khác nhau (tùy thuộc vào nonce).

**Giải pháp:**
- Luôn update `.env` sau khi deploy
- Hoặc dùng script tự động: `.\scripts\deploy-and-update-env.ps1`

### Private Key

**Lưu ý:**
- Hardhat local node có 20 accounts mặc định
- Account #0 private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- Backend dùng account này để mint/burn tokens
- **KHÔNG commit private key vào git!**

---

## 🔄 Workflow Khi Restart Project

### Khi Restart Hardhat Node:

1. **Start Hardhat node:**
   ```bash
   cd blockchain
   npm run node
   ```

2. **Deploy contracts:**
   ```bash
   # Terminal mới
   cd blockchain
   npm run deploy:local
   ```

3. **Update .env:**
   - Copy addresses từ output
   - Update `backend/.env`

4. **Test:**
   ```bash
   cd backend
   npm run test:blockchain
   ```

5. **Restart backend:**
   ```bash
   cd backend
   npm run dev
   ```

### Hoặc Dùng Script Tự Động:

```powershell
.\scripts\deploy-and-update-env.ps1
```

---

## 🧪 Verify Sau Khi Deploy

### Test Blockchain Config

```bash
cd backend
npm run test:blockchain
```

### Test Đăng Ký User Mới

1. Đăng ký user mới
2. Check backend logs:
   - Phải thấy: `🔗 Blockchain enabled...`
   - Phải thấy: `✅ Transaction registered on blockchain...`
   - Phải thấy: `✅ Tokens minted successfully`

3. Check blockchain balance:
   ```bash
   GET /api/blockchain/balance
   ```

4. Check blockchain transactions:
   ```bash
   GET /api/blockchain/transactions
   ```

---

## 📚 References

- [BLOCKCHAIN_QUICK_START.md](./BLOCKCHAIN_QUICK_START.md) - Quick setup
- [BLOCKCHAIN_DEBUG_GUIDE.md](./BLOCKCHAIN_DEBUG_GUIDE.md) - Debug guide
- [deploy-and-update-env.ps1](../scripts/deploy-and-update-env.ps1) - Auto deploy script





