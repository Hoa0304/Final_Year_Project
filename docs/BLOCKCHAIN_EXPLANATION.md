# Giải thích Blockchain trong HMall

## Blockchain là gì?

**Blockchain** (chuỗi khối) là một công nghệ lưu trữ dữ liệu theo cách:
- **Bất biến (Immutable)**: Một khi đã ghi, không thể sửa hoặc xóa
- **Phân tán (Distributed)**: Dữ liệu được lưu trên nhiều máy tính
- **Minh bạch (Transparent)**: Ai cũng có thể xem và verify
- **An toàn (Secure)**: Dùng mã hóa để đảm bảo tính toàn vẹn

### Ví dụ đơn giản:

Hãy tưởng tượng một **cuốn sổ cái công khai**:
- Mỗi trang là một "block" (khối)
- Mỗi giao dịch được ghi vào một trang
- Các trang được nối với nhau bằng "hash" (mã băm)
- Nếu ai đó sửa một trang, tất cả các trang sau sẽ không khớp → phát hiện ngay

## Blockchain trong HMall

### Tại sao dùng Blockchain?

1. **Audit Trail (Dấu vết kiểm toán)**: 
   - Ghi lại TẤT CẢ transactions một cách bất biến
   - Không thể giả mạo hoặc xóa lịch sử

2. **Transparency (Minh bạch)**:
   - User có thể verify transactions của mình
   - Admin có thể xem toàn bộ hệ thống

3. **Security (Bảo mật)**:
   - Ngăn double-spending (chi tiêu 2 lần)
   - Ngăn double-claiming (nhận thưởng 2 lần)

4. **Trust (Tin cậy)**:
   - Không cần tin tưởng một bên trung gian
   - Blockchain tự động verify

## Kiến trúc Blockchain trong HMall

### 1. Local Blockchain (Hardhat)

```
┌─────────────────────────────────────┐
│   Hardhat Local Blockchain Node    │
│   (Chạy trên localhost:8545)       │
│                                     │
│   - Miễn phí                        │
│   - Không cần phí gas               │
│   - Chỉ dùng cho development        │
└─────────────────────────────────────┘
```

**Tại sao Local?**
- Development: Test nhanh, không tốn tiền
- Production: Có thể deploy lên testnet/mainnet sau

### 2. Smart Contracts

#### a) HMallToken.sol
**Chức năng**: Quản lý virtual currency tokens

```
┌─────────────────────────────────────┐
│         HMallToken Contract         │
│                                     │
│  Functions:                         │
│  - mint(to, amount)                 │
│    → Tạo tokens mới                 │
│  - burn(from, amount)               │
│    → Hủy tokens                     │
│  - transfer(to, amount)              │
│    → Chuyển tokens                  │
│  - balanceOf(address)                │
│    → Xem số dư                      │
└─────────────────────────────────────┘
```

**Ví dụ**:
- User hoàn thành task → `mint(userAddress, 100)` → User nhận 100 tokens
- User mua sản phẩm → `burn(userAddress, 50)` → User mất 50 tokens

#### b) TransactionRegistry.sol
**Chức năng**: Ghi lại TẤT CẢ transactions

```
┌─────────────────────────────────────┐
│    TransactionRegistry Contract     │
│                                     │
│  Functions:                         │
│  - registerTransaction(...)          │
│    → Ghi transaction lên blockchain │
│  - getTransaction(txId)              │
│    → Lấy chi tiết transaction       │
│  - getUserTransactionIds(user)       │
│    → Lấy danh sách TX của user      │
└─────────────────────────────────────┘
```

**Dữ liệu được ghi**:
- User address
- Transaction type (earn, spend, grant, etc.)
- Amount
- Balance before/after
- Description
- Reference ID (link đến order, task, etc.)
- Timestamp

#### c) TaskRewardSystem.sol
**Chức năng**: Ngăn double-claiming task rewards

```
┌─────────────────────────────────────┐
│     TaskRewardSystem Contract       │
│                                     │
│  Functions:                         │
│  - claimTaskReward(taskId, user)    │
│    → Claim reward (chỉ 1 lần)      │
│  - isTaskRewardClaimed(...)         │
│    → Check đã claim chưa            │
└─────────────────────────────────────┘
```

**Ví dụ**:
- User complete task → Check blockchain → Chưa claim → Claim → Ghi lại
- User cố claim lại → Check blockchain → Đã claim → Từ chối

## Flow Blockchain trong HMall

### Flow 1: User Earn Coins (Task Reward)

```
┌──────────┐
│   User   │
│ Complete │
│   Task   │
└────┬─────┘
     │
     ▼
┌─────────────────┐
│  Backend API    │
│  POST /tasks/   │
│  {id}/complete  │
└────┬────────────┘
     │
     ▼
┌─────────────────────────┐
│  1. Validate Task       │
│     - Check requirements│
│     - Check not claimed │
└────┬────────────────────┘
     │
     ▼
┌─────────────────────────┐
│  2. Check Blockchain    │
│     TaskRewardSystem    │
│     .isTaskRewardClaimed│
│     → false (OK)        │
└────┬────────────────────┘
     │
     ▼
┌─────────────────────────┐
│  3. Claim on Blockchain│
│     TaskRewardSystem    │
│     .claimTaskReward()  │
│     → TX Hash: 0x...   │
└────┬────────────────────┘
     │
     ▼
┌─────────────────────────┐
│  4. Save to Database   │
│     - Create transaction│
│     - Update balance    │
└────┬────────────────────┘
     │
     ▼
┌─────────────────────────┐
│  5. Register on Chain  │
│     TransactionRegistry │
│     .registerTransaction│
│     → TX ID: 123       │
└────┬────────────────────┘
     │
     ▼
┌─────────────────────────┐
│  6. Mint Tokens         │
│     HMallToken          │
│     .mint(user, 100)    │
│     → Balance +100     │
└────┬────────────────────┘
     │
     ▼
┌──────────┐
│ Success! │
│ +100 VKU │
└──────────┘
```

### Flow 2: User Spend Coins (Purchase Product)

```
┌──────────┐
│   User   │
│ Purchase │
│ Product  │
└────┬─────┘
     │
     ▼
┌─────────────────┐
│  Backend API    │
│  POST /products │
│  /purchase      │
└────┬────────────┘
     │
     ▼
┌─────────────────────────┐
│  1. Validate Purchase   │
│     - Check balance     │
│     - Check stock       │
└────┬────────────────────┘
     │
     ▼
┌─────────────────────────┐
│  2. Save to Database    │
│     - Create order      │
│     - Create transaction│
│     - Update balance    │
└────┬────────────────────┘
     │
     ▼
┌─────────────────────────┐
│  3. Register on Chain  │
│     TransactionRegistry │
│     .registerTransaction│
│     → TX ID: 124       │
└────┬────────────────────┘
     │
     ▼
┌─────────────────────────┐
│  4. Burn Tokens         │
│     HMallToken          │
│     .burn(user, 50)     │
│     → Balance -50      │
└────┬────────────────────┘
     │
     ▼
┌──────────┐
│ Success! │
│ Order OK │
└──────────┘
```

### Flow 3: Admin Grant Coins

```
┌──────────┐
│  Admin   │
│  Grant   │
│  Coins   │
└────┬─────┘
     │
     ▼
┌─────────────────┐
│  Backend API    │
│  POST /admin/   │
│  users/:id/coins│
└────┬────────────┘
     │
     ▼
┌─────────────────────────┐
│  1. Save to Database    │
│     - Create transaction│
│     - Update balance    │
└────┬────────────────────┘
     │
     ▼
┌─────────────────────────┐
│  2. Register on Chain  │
│     TransactionRegistry │
│     .registerTransaction│
│     → TX ID: 125       │
│     → createdBy: admin │
└────┬────────────────────┘
     │
     ▼
┌─────────────────────────┐
│  3. Mint Tokens         │
│     HMallToken          │
│     .mint(user, 500)    │
│     → Balance +500     │
└────┬────────────────────┘
     │
     ▼
┌──────────┐
│ Success! │
│ +500 VKU │
└──────────┘
```

## So sánh: Database vs Blockchain

### Database (Supabase/PostgreSQL)
```
┌─────────────────────────────────────┐
│         Database (PostgreSQL)       │
│                                     │
│  ✅ Nhanh                           │
│  ✅ Dễ query                        │
│  ✅ Source of truth                 │
│  ❌ Có thể sửa/xóa                  │
│  ❌ Cần tin tưởng admin             │
└─────────────────────────────────────┘
```

### Blockchain
```
┌─────────────────────────────────────┐
│         Blockchain (Hardhat)         │
│                                     │
│  ✅ Bất biến (immutable)            │
│  ✅ Minh bạch (transparent)         │
│  ✅ Không cần tin tưởng             │
│  ❌ Chậm hơn database               │
│  ❌ Khó query                        │
└─────────────────────────────────────┘
```

### Kết hợp (Hybrid Approach)

```
┌─────────────────────────────────────┐
│         HMall Architecture           │
│                                     │
│  Database (Fast)                    │
│    ↓                                │
│  Business Logic                     │
│    ↓                                │
│  Blockchain (Audit Trail)           │
│                                     │
│  ✅ Database: Source of truth      │
│  ✅ Blockchain: Audit trail         │
│  ✅ Best of both worlds             │
└─────────────────────────────────────┘
```

## Ví dụ thực tế

### Scenario: User mua sản phẩm

**1. Database (Supabase)**
```sql
-- Transaction table
INSERT INTO transactions (
  user_id, type, amount, balance_before, balance_after
) VALUES (
  'user-123', 'spend', 50.00, 1000.00, 950.00
);

-- Users table
UPDATE users SET virtual_balance = 950.00 WHERE id = 'user-123';
```

**2. Blockchain (Hardhat)**
```solidity
// TransactionRegistry
registerTransaction(
  userAddress: "0xABC...",
  transactionType: "spend",
  amount: 50000000000000000000, // 50 tokens in wei
  balanceBefore: 1000000000000000000000, // 1000 tokens
  balanceAfter: 950000000000000000000, // 950 tokens
  description: "Purchase: Virtual Laptop",
  referenceId: "0x...", // Order ID hash
  referenceType: "order"
);

// HMallToken
burn(userAddress, 50000000000000000000); // Burn 50 tokens
```

**3. Kết quả**
- Database: Balance = 950.00 ✅
- Blockchain: Balance = 950.00 ✅
- Blockchain: Transaction recorded với TX ID = 124 ✅

## Lợi ích của Blockchain trong HMall

### 1. Audit Trail
- **Vấn đề**: Admin có thể sửa database
- **Giải pháp**: Blockchain ghi lại mọi thay đổi → Không thể giả mạo

### 2. Double-claiming Prevention
- **Vấn đề**: User có thể claim task reward nhiều lần
- **Giải pháp**: Blockchain check trước khi claim → Chỉ claim 1 lần

### 3. Transparency
- **Vấn đề**: User không tin hệ thống
- **Giải pháp**: User có thể verify trên blockchain → Tin cậy

### 4. Compliance
- **Vấn đề**: Cần audit trail cho compliance
- **Giải pháp**: Blockchain cung cấp immutable audit trail

## Tóm tắt

1. **Blockchain** = Cuốn sổ cái công khai, bất biến
2. **HMall dùng blockchain** để:
   - Ghi lại tất cả transactions (audit trail)
   - Quản lý tokens (mint/burn)
   - Ngăn double-claiming
3. **Flow**: Database (fast) → Blockchain (audit)
4. **Local blockchain** cho development, có thể deploy lên testnet/mainnet sau

## Next Steps

- Xem [BLOCKCHAIN_SETUP.md](./BLOCKCHAIN_SETUP.md) để setup
- Xem [BLOCKCHAIN_QUICK_START.md](./BLOCKCHAIN_QUICK_START.md) để bắt đầu nhanh
- Xem Admin Dashboard để xem blockchain data






