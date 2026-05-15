# Blockchain Troubleshooting Guide

Hướng dẫn xử lý các vấn đề thường gặp với blockchain trong HMall.

---

## 🔍 Vấn Đề 1: Token Balance = 0 nhưng Database Balance = 1000

### Triệu Chứng:
- User đăng ký mới có 1000 coins trong database
- Nhưng blockchain token balance = 0
- Transactions không hiển thị

### Nguyên Nhân:
1. Blockchain chưa được enable khi user đăng ký
2. Blockchain transaction fail nhưng database đã commit
3. Contracts chưa được deploy

### Giải Pháp:

#### Bước 1: Kiểm Tra Blockchain Status

```bash
# Check backend logs
# Tìm dòng: "Blockchain registration error"
```

Nếu thấy lỗi:
- `Token contract does not exist` → Contracts chưa được deploy
- `could not decode result data` → ABI mismatch hoặc contract không tồn tại

#### Bước 2: Sync Balances từ Database lên Blockchain

**Cách 1: Qua API (Admin)**

```bash
POST /api/admin/blockchain/sync-balances
Authorization: Bearer <admin_token>
```

**Cách 2: Qua Script**

```bash
cd backend
npx ts-node src/scripts/sync-balances-to-blockchain.ts
```

Script sẽ:
- Lấy tất cả users có balance > 0
- So sánh database balance vs blockchain balance
- Mint tokens nếu database balance > blockchain balance
- Ghi transaction lên blockchain

#### Bước 3: Verify

```bash
# Check user balance trên blockchain
GET /api/blockchain/balance
Authorization: Bearer <user_token>

# Check transactions
GET /api/blockchain/transactions
Authorization: Bearer <user_token>
```

---

## 🔍 Vấn Đề 2: Transactions Không Hiển Thị

### Triệu Chứng:
- User/Admin không thấy transactions
- TransactionsScreen trống
- Admin dashboard không có transactions

### Nguyên Nhân:
1. Transaction không được tạo trong database
2. Frontend không fetch đúng endpoint
3. Filter category loại bỏ transactions

### Giải Pháp:

#### Bước 1: Kiểm Tra Database

```sql
-- Check transactions trong database
SELECT * FROM transactions 
WHERE user_id = '<user_id>' 
ORDER BY created_at DESC 
LIMIT 10;
```

Nếu không có transactions:
- Kiểm tra backend logs khi đăng ký
- Tìm dòng: "Transaction created in database"
- Nếu không thấy → Transaction creation fail

#### Bước 2: Kiểm Tra Backend Logs

Khi đăng ký, tìm:
```
💰 Granting initial balance of 1000 coins to user <user_id>
📝 Creating transaction: userId=<user_id>, type=grant, amount=1000
✅ Transaction created in database: <transaction_id>
✅ Transaction verified in database: {...}
```

Nếu không thấy → Transaction không được tạo

#### Bước 3: Kiểm Tra Frontend

**User Transactions:**
- Endpoint: `GET /api/transactions`
- Check browser console: `📊 Fetched X transactions`

**Admin Transactions:**
- Endpoint: `GET /api/admin/transactions` (Database)
- Endpoint: `GET /api/blockchain/admin/all` (Blockchain)

#### Bước 4: Test API Trực Tiếp

```bash
# User transactions
curl -X GET http://localhost:3002/api/transactions \
  -H "Authorization: Bearer <user_token>"

# Admin transactions (database)
curl -X GET http://localhost:3002/api/admin/transactions \
  -H "Authorization: Bearer <admin_token>"

# Admin transactions (blockchain)
curl -X GET http://localhost:3002/api/blockchain/admin/all \
  -H "Authorization: Bearer <admin_token>"
```

---

## 🔍 Vấn Đề 3: Lỗi "could not decode result data"

### Triệu Chứng:
```
Error: could not decode result data (value="0x", info={ "method": "balanceOf", ... })
```

### Nguyên Nhân:
1. Contract chưa được deploy
2. Contract address sai trong `.env`
3. ABI không khớp với contract

### Giải Pháp:

#### Bước 1: Kiểm Tra Contracts Đã Deploy

```bash
cd blockchain
npm run deploy:local
```

Copy addresses và update `.env`:
```env
BLOCKCHAIN_TOKEN_ADDRESS=0x...
BLOCKCHAIN_REGISTRY_ADDRESS=0x...
BLOCKCHAIN_TASK_SYSTEM_ADDRESS=0x...
```

#### Bước 2: Verify Contract Exists

Code đã tự động check:
- Nếu contract không tồn tại → Return giá trị mặc định (0 hoặc [])
- Không throw error → Hệ thống vẫn hoạt động

#### Bước 3: Restart Backend

```bash
cd backend
npm run dev
```

---

## 🔍 Vấn Đề 4: Blockchain Balance Không Khớp với Database

### Triệu Chứng:
- Database: 1000 coins
- Blockchain: 0 coins
- Audit phát hiện mismatch

### Giải Pháp:

#### Chạy Sync Script

```bash
cd backend
npx ts-node src/scripts/sync-balances-to-blockchain.ts
```

Hoặc qua API:
```bash
POST /api/admin/blockchain/sync-balances
```

---

## 📋 Checklist Debug

### Khi User Đăng Ký Mới:

1. ✅ **Check Backend Logs:**
   ```
   💰 Granting initial balance...
   📝 Creating transaction...
   ✅ Transaction created in database...
   ✅ Transaction verified in database...
   ```

2. ✅ **Check Database:**
   ```sql
   SELECT * FROM transactions WHERE user_id = '<user_id>';
   SELECT virtual_balance FROM users WHERE id = '<user_id>';
   ```

3. ✅ **Check Blockchain:**
   ```bash
   GET /api/blockchain/balance
   GET /api/blockchain/transactions
   ```

4. ✅ **Check Frontend:**
   - Mở TransactionsScreen
   - Check browser console
   - Verify transactions hiển thị

### Khi Transactions Không Hiển Thị:

1. ✅ **Check Database có transactions không:**
   ```sql
   SELECT COUNT(*) FROM transactions WHERE user_id = '<user_id>';
   ```

2. ✅ **Check API Response:**
   ```bash
   curl http://localhost:3002/api/transactions \
     -H "Authorization: Bearer <token>"
   ```

3. ✅ **Check Frontend Console:**
   - Browser DevTools → Network tab
   - Xem request `/api/transactions`
   - Check response data

4. ✅ **Check Filter:**
   - TransactionsScreen có filter category không?
   - Thử bỏ filter

---

## 🛠️ Tools & Commands

### Sync Balances

```bash
# Via API
curl -X POST http://localhost:3002/api/admin/blockchain/sync-balances \
  -H "Authorization: Bearer <admin_token>"

# Via Script
cd backend
npx ts-node src/scripts/sync-balances-to-blockchain.ts
```

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

### Check Database

```sql
-- All transactions
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;

-- User transactions
SELECT * FROM transactions WHERE user_id = '<user_id>' ORDER BY created_at DESC;

-- User balance
SELECT id, email, virtual_balance FROM users WHERE id = '<user_id>';
```

### Run Audit

```bash
# Full audit
curl http://localhost:3002/api/admin/blockchain-audit/all \
  -H "Authorization: Bearer <admin_token>"

# User audit
curl http://localhost:3002/api/admin/blockchain-audit/user/<user_id> \
  -H "Authorization: Bearer <admin_token>"
```

---

## 🎯 Quick Fixes

### Fix 1: User mới đăng ký không có balance trên blockchain

```bash
# Sync tất cả balances
POST /api/admin/blockchain/sync-balances
```

### Fix 2: Transactions không hiển thị

1. Check database có transactions không
2. Check API response
3. Clear frontend cache: `npx expo start --clear`

### Fix 3: Blockchain errors

1. Restart Hardhat node
2. Redeploy contracts
3. Update `.env` với addresses mới
4. Restart backend

---

## 📚 References

- [BLOCKCHAIN_QUICK_START.md](./BLOCKCHAIN_QUICK_START.md) - Setup blockchain
- [BLOCKCHAIN_SETUP.md](./BLOCKCHAIN_SETUP.md) - Detailed setup
- [sync-balances-to-blockchain.ts](../backend/src/scripts/sync-balances-to-blockchain.ts) - Sync script





