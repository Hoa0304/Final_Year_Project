# Blockchain Audit System - HMall

## Vấn đề: Tính minh bạch và phát hiện thao túng

### Vấn đề

Nếu admin có quyền truy cập database, họ có thể:
- ❌ Insert thêm coins cho chính mình
- ❌ Insert coins cho user bất kỳ với số lượng lớn
- ❌ Sửa/xóa transactions
- ❌ Thao túng balance

**Blockchain giải quyết vấn đề này như thế nào?**

## Giải pháp: Blockchain Audit System

### 1. Tự động ghi lên Blockchain

Mọi transaction đều được **tự động ghi lên blockchain**:

```
Admin Grant Coins
    ↓
Database: INSERT transaction ✅
    ↓
Blockchain: registerTransaction() ✅
    ↓
Blockchain: mint() tokens ✅
```

**Nếu admin insert trực tiếp vào database:**
- ❌ Transaction KHÔNG có trên blockchain
- ✅ Audit system sẽ phát hiện ngay

### 2. Audit System

Hệ thống audit tự động kiểm tra:

#### a) Balance Verification
- So sánh database balance vs blockchain balance
- Phát hiện nếu có sự không khớp

#### b) Transaction Count Verification
- So sánh số lượng transactions
- Phát hiện nếu có transaction bị thiếu trên blockchain

#### c) Transaction Matching
- Kiểm tra từng transaction có tồn tại trên blockchain không
- Verify amount, timestamp, type

### 3. API Endpoints

#### Audit một user
```http
GET /api/admin/blockchain-audit/user/:userId
Authorization: Bearer <admin_token>
```

Response:
```json
{
  "success": false,
  "audit": {
    "userId": "uuid",
    "userEmail": "user@example.com",
    "databaseBalance": 10000.00,
    "blockchainBalance": 1000.00,
    "match": false,
    "discrepancy": 9000.00,
    "databaseTxCount": 50,
    "blockchainTxCount": 10,
    "txCountMatch": false,
    "issues": [
      "Balance mismatch: DB=10000, BC=1000, Diff=9000.00",
      "Transaction count mismatch: DB=50, BC=10"
    ]
  },
  "message": "⚠️ Mismatch detected between database and blockchain"
}
```

#### Audit tất cả users
```http
GET /api/admin/blockchain-audit/all
Authorization: Bearer <admin_token>
```

#### Tìm transactions không có trên blockchain
```http
GET /api/admin/blockchain-audit/unrecorded?userId=xxx
Authorization: Bearer <admin_token>
```

#### Verify một transaction
```http
GET /api/admin/blockchain-audit/verify/:transactionId?userId=xxx
Authorization: Bearer <admin_token>
```

## Cách sử dụng

### 1. Trong Admin Dashboard

1. Mở `admin-blockchain/index.html`
2. Login với admin token
3. Click **"Run Full Audit"**
4. Xem kết quả:
   - ✅ Matched: Tất cả users khớp blockchain
   - ⚠️ Mismatched: Có users không khớp → Có thể bị thao túng

### 2. Qua API

```bash
# Audit tất cả users
curl -X GET http://localhost:3002/api/admin/blockchain-audit/all \
  -H "Authorization: Bearer <admin_token>"

# Audit một user cụ thể
curl -X GET http://localhost:3002/api/admin/blockchain-audit/user/<user_id> \
  -H "Authorization: Bearer <admin_token>"

# Tìm transactions không có trên blockchain
curl -X GET "http://localhost:3002/api/admin/blockchain-audit/unrecorded" \
  -H "Authorization: Bearer <admin_token>"
```

## Ví dụ: Phát hiện thao túng

### Scenario 1: Admin insert coins trực tiếp vào database

```sql
-- Admin cố gắng insert trực tiếp (KHÔNG qua API)
UPDATE users SET virtual_balance = 100000 WHERE id = 'admin-id';
INSERT INTO transactions (user_id, type, amount, ...) VALUES (...);
```

**Kết quả:**
- ✅ Database: Balance = 100000
- ❌ Blockchain: Balance = 1000 (không thay đổi)
- ⚠️ Audit: Phát hiện mismatch ngay lập tức

### Scenario 2: Admin grant coins qua API (đúng cách)

```http
POST /api/admin/users/:id/coins
Body: { "amount": 5000 }
```

**Kết quả:**
- ✅ Database: Balance updated
- ✅ Blockchain: Transaction registered
- ✅ Blockchain: Tokens minted
- ✅ Audit: Match ✅

### Scenario 3: User mua hàng

```http
POST /api/products/purchase
Body: { "productId": "...", "quantity": 1 }
```

**Kết quả:**
- ✅ Database: Transaction created, balance updated
- ✅ Blockchain: Transaction registered
- ✅ Blockchain: Tokens burned
- ✅ Audit: Match ✅

## Bảo vệ chống thao túng

### 1. Immutable Blockchain
- Một khi đã ghi, không thể sửa/xóa
- Mọi thay đổi đều được ghi lại

### 2. Automatic Recording
- Mọi transaction qua API đều tự động ghi blockchain
- Không thể bypass (trừ khi sửa code)

### 3. Audit System
- Tự động phát hiện mismatch
- Cảnh báo khi có sự không khớp

### 4. Transparency
- Admin có thể audit bất cứ lúc nào
- User có thể verify transactions của mình

## Limitations (Hạn chế)

### 1. Local Blockchain
- Hiện tại dùng local blockchain (Hardhat)
- Admin có thể reset blockchain node
- **Giải pháp**: Deploy lên testnet/mainnet

### 2. Database vẫn là Source of Truth
- Nếu blockchain fail, database vẫn hoạt động
- Cần monitor để đảm bảo blockchain luôn sync

### 3. Performance
- Audit tất cả users có thể chậm
- Nên chạy định kỳ, không real-time

## Best Practices

### 1. Regular Audits
- Chạy audit hàng ngày/tuần
- Tự động hóa với cron job

### 2. Alert System
- Gửi alert khi phát hiện mismatch
- Log tất cả audit results

### 3. Production Deployment
- Deploy blockchain lên testnet/mainnet
- Không thể reset hoặc thao túng

### 4. Access Control
- Giới hạn quyền truy cập database
- Chỉ cho phép thay đổi qua API (có blockchain recording)

## Tóm tắt

1. **Blockchain** = Immutable audit trail
2. **Audit System** = Phát hiện thao túng
3. **Mismatch Detection** = Cảnh báo khi database ≠ blockchain
4. **Transparency** = Admin và user đều có thể verify

**Kết luận**: Blockchain không ngăn admin thao túng database, nhưng **phát hiện ngay lập tức** khi có thao túng. Đây là tính minh bạch và audit trail.






