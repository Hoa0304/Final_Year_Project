# Blockchain Transaction Storage và UI Display

Tài liệu này giải thích chi tiết cách blockchain lưu trữ transaction và cách admin dashboard hiển thị lịch sử giao dịch.

---

## 📦 1. Cách Blockchain Lưu Transaction (Data Storage)

### 1.1. Smart Contract Structure

Blockchain sử dụng smart contract `TransactionRegistry.sol` để lưu trữ transactions:

```solidity
// blockchain/contracts/TransactionRegistry.sol

struct Transaction {
    uint256 id;                    // Transaction ID (tự động tăng)
    address user;                  // Địa chỉ blockchain của user
    string transactionType;        // "earn", "spend", "grant", "revoke", etc.
    uint256 amount;                // Số lượng coin (lưu dưới dạng wei)
    uint256 balanceBefore;         // Số dư trước transaction
    uint256 balanceAfter;          // Số dư sau transaction
    string description;            // Mô tả transaction
    bytes32 referenceId;           // Hash của UUID từ database
    string referenceType;          // "order", "task", "stock", etc.
    address createdBy;              // Địa chỉ admin nếu có
    uint256 timestamp;             // Thời gian tạo (block.timestamp)
    bool exists;                   // Flag để kiểm tra transaction tồn tại
}
```

### 1.2. Storage Mechanism

Smart contract sử dụng **mapping** để lưu trữ:

```solidity
// Mapping từ transaction ID → Transaction struct
mapping(uint256 => Transaction) public transactions;

// Mapping từ user address → Array of transaction IDs
mapping(address => uint256[]) public userTransactions;

// Tổng số transactions
uint256 public transactionCount;
```

**Cách hoạt động:**

1. **Khi có transaction mới:**
   - `transactionCount++` → Tạo ID mới
   - Tạo `Transaction` struct với tất cả thông tin
   - Lưu vào `transactions[txId] = newTx`
   - Thêm `txId` vào `userTransactions[userAddress]`
   - Emit event `TransactionRegistered`

2. **Dữ liệu được lưu trên blockchain:**
   - **Immutable**: Không thể sửa hoặc xóa
   - **Permanent**: Tồn tại vĩnh viễn trên blockchain
   - **Transparent**: Ai cũng có thể đọc
   - **Timestamp**: Tự động ghi nhận thời gian từ block

### 1.3. Ví dụ: Khi User Mua Hàng

**Flow:**

```
1. User mua hàng (Frontend)
   ↓
2. Backend API: POST /api/orders
   ↓
3. transaction.service.ts: createTransaction()
   ├─→ Lưu vào Database (Supabase) ──→ Fast, Queryable
   └─→ Gọi blockchain.service.ts: registerTransaction()
       ↓
4. blockchain.service.ts: registerTransaction()
   ├─→ Convert amount → wei (ethers.parseEther)
   ├─→ Convert UUID → bytes32 (uuidToBytes32)
   └─→ Gọi smart contract: registryContract.registerTransaction()
       ↓
5. Smart Contract: TransactionRegistry.registerTransaction()
   ├─→ transactionCount++ (ví dụ: ID = 5)
   ├─→ Tạo Transaction struct
   ├─→ transactions[5] = newTx
   ├─→ userTransactions[0x123...].push(5)
   ├─→ Emit TransactionRegistered event
   └─→ Return txId = 5
       ↓
6. Backend nhận txId và log
```

**Code thực tế:**

```typescript
// backend/src/services/blockchain.service.ts

export async function registerTransaction(params: RegisterTransactionParams): Promise<number> {
  const registryContract = getContract(registryAddress, REGISTRY_ABI);
  
  // Convert amounts to wei (blockchain dùng wei, không dùng decimal)
  const amountWei = ethers.parseEther(params.amount.toString());
  const balanceBeforeWei = ethers.parseEther(params.balanceBefore.toString());
  const balanceAfterWei = ethers.parseEther(params.balanceAfter.toString());

  // Convert UUID to bytes32 (blockchain không hỗ trợ string dài)
  const referenceIdBytes32 = params.referenceId 
    ? uuidToBytes32(params.referenceId)
    : '0x0000000000000000000000000000000000000000000000000000000000000000';

  // Gọi smart contract
  const tx = await registryContract.registerTransaction(
    params.userAddress,        // 0x123...
    params.transactionType,    // "spend"
    amountWei,                 // 1000000000000000000 (1 token = 10^18 wei)
    balanceBeforeWei,          // 5000000000000000000
    balanceAfterWei,           // 4000000000000000000
    params.description || '',   // "Purchase order #123"
    referenceIdBytes32,        // 0xabc123...
    params.referenceType || '', // "order"
    createdBy                  // 0x000... (zero address nếu không có admin)
  );

  const receipt = await tx.wait(); // Đợi transaction được confirm
  
  // Lấy transaction ID từ blockchain
  const txCount = await registryContract.transactionCount();
  return Number(txCount); // Trả về ID mới nhất
}
```

### 1.4. Đọc Transaction từ Blockchain

**Cách đọc:**

```typescript
// backend/src/services/blockchain.service.ts

export async function getBlockchainTransaction(txId: number) {
  const registryContract = getContract(registryAddress, REGISTRY_ABI);
  
  // Gọi view function (không tốn gas, chỉ đọc)
  const tx = await registryContract.getTransaction(txId);

  // Convert từ wei về token (chia cho 10^18)
  return {
    id: Number(tx.id),
    user: tx.user,
    transactionType: tx.transactionType,
    amount: parseFloat(ethers.formatEther(tx.amount)), // 1000000000000000000 → 1.0
    balanceBefore: parseFloat(ethers.formatEther(tx.balanceBefore)),
    balanceAfter: parseFloat(ethers.formatEther(tx.balanceAfter)),
    description: tx.description,
    referenceId: tx.referenceId,
    referenceType: tx.referenceType,
    createdBy: tx.createdBy,
    timestamp: Number(tx.timestamp), // Unix timestamp
  };
}
```

**Lấy danh sách transaction của user:**

```typescript
export async function getUserTransactionIds(userAddress: string): Promise<number[]> {
  const registryContract = getContract(registryAddress, REGISTRY_ABI);
  
  // Lấy array of transaction IDs
  const txIds = await registryContract.getUserTransactionIds(userAddress);
  // Ví dụ: [1, 3, 5, 7]
  
  return txIds.map((id: bigint) => Number(id));
}
```

---

## 🖥️ 2. Cách Admin Dashboard Hiển thị Lịch Sử Giao Dịch

### 2.1. Flow Từ Blockchain/Database → UI

```
┌─────────────────────────────────────────────────────────────┐
│  Admin Dashboard (admin-blockchain/index.html)              │
│                                                              │
│  1. User mở dashboard                                        │
│  2. JavaScript: loadTransactions()                          │
│  3. Fetch API: GET /api/admin/transactions                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend API (Express)                                       │
│                                                              │
│  GET /api/admin/transactions                                 │
│  → admin.controller.ts: getAllTransactions()                 │
│  → Query Supabase: SELECT * FROM transactions                │
│  → Join với users table để lấy email, full_name             │
│  → Return JSON: { transactions: [...], total: 100 }         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Database (Supabase PostgreSQL)                              │
│                                                              │
│  transactions table:                                         │
│  - id (UUID)                                                 │
│  - user_id (UUID)                                            │
│  - type (string)                                             │
│  - amount (decimal)                                          │
│  - balance_before (decimal)                                  │
│  - balance_after (decimal)                                   │
│  - description (text)                                        │
│  - created_at (timestamp)                                    │
│  - reference_id (UUID)                                       │
│  - reference_type (string)                                   │
│  - created_by (UUID)                                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2. Backend API Endpoint

**Code:**

```typescript
// backend/src/controllers/admin.controller.ts

export async function getAllTransactions(req: Request, res: Response) {
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const userId = req.query.userId as string | undefined;
  const type = req.query.type as string | undefined;

  // Query Supabase với join users table
  let query = supabase
    .from('transactions')
    .select(`
      *,
      user:user_id (
        id,
        email,
        full_name
      ),
      created_by_user:created_by (
        id,
        email,
        full_name
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by user if provided
  if (userId) {
    query = query.eq('user_id', userId);
  }

  // Filter by type if provided
  if (type) {
    query = query.eq('type', type);
  }

  const { data: transactions, error } = await query;

  // Get total count for pagination
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });

  res.json({
    transactions: transactions || [],
    total: count || 0,
    limit,
    offset,
  });
}
```

**Response JSON:**

```json
{
  "transactions": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "user_id": "456e7890-e89b-12d3-a456-426614174001",
      "type": "spend",
      "amount": "50.00",
      "balance_before": "1000.00",
      "balance_after": "950.00",
      "description": "Purchase order #123",
      "created_at": "2025-01-15T10:30:00Z",
      "reference_id": "789e0123-e89b-12d3-a456-426614174002",
      "reference_type": "order",
      "created_by": null,
      "user": {
        "id": "456e7890-e89b-12d3-a456-426614174001",
        "email": "user@example.com",
        "full_name": "John Doe"
      },
      "created_by_user": null
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

### 2.3. Frontend JavaScript (Admin Dashboard)

**Code:**

```javascript
// admin-blockchain/index.html

async function loadTransactions() {
  if (!authToken) {
    document.getElementById('transactionsContainer').innerHTML = 
      '<div class="error">Authentication required</div>';
    return;
  }

  try {
    // Fetch từ backend API
    const response = await fetch(`${API_URL}/admin/transactions?limit=50`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }

    const data = await response.json();
    
    if (data.transactions && data.transactions.length > 0) {
      // Render ra HTML table
      displayDatabaseTransactions(data.transactions);
      // Update total count
      document.getElementById('totalTx').textContent = data.total || data.transactions.length;
    } else {
      document.getElementById('transactionsContainer').innerHTML = 
        '<div class="loading">No transactions found</div>';
    }
  } catch (error) {
    document.getElementById('transactionsContainer').innerHTML = 
      `<div class="error">Error loading transactions: ${error.message}</div>`;
  }
}

function displayDatabaseTransactions(transactions) {
  const html = `
    <table class="transactions-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>User</th>
          <th>Type</th>
          <th>Amount</th>
          <th>Balance Before</th>
          <th>Balance After</th>
          <th>Description</th>
          <th>Created At</th>
        </tr>
      </thead>
      <tbody>
        ${transactions.map(tx => `
          <tr>
            <td>${tx.id.substring(0, 8)}...</td>
            <td>${tx.user ? (tx.user.email || tx.user.full_name || 'N/A') : 'N/A'}</td>
            <td><span class="badge ${getTypeBadgeClass(tx.type)}">${tx.type}</span></td>
            <td>${parseFloat(tx.amount).toFixed(2)} VKU</td>
            <td>${parseFloat(tx.balance_before).toFixed(2)} VKU</td>
            <td>${parseFloat(tx.balance_after).toFixed(2)} VKU</td>
            <td>${tx.description || '-'}</td>
            <td>${new Date(tx.created_at).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  document.getElementById('transactionsContainer').innerHTML = html;
}

function getTypeBadgeClass(type) {
  // Màu sắc cho từng loại transaction
  if (type === 'earn' || type === 'grant' || type === 'task_reward' || type === 'stock_profit') {
    return 'badge-success'; // Xanh lá (tăng coin)
  } else if (type === 'spend' || type === 'revoke' || type === 'stock_loss') {
    return 'badge-danger'; // Đỏ (giảm coin)
  }
  return 'badge-info'; // Xanh dương (khác)
}
```

### 2.4. Tại Sao Admin Dashboard Hiển Thị Từ Database, Không Phải Blockchain?

**Lý do:**

1. **Performance:**
   - Database query nhanh hơn (milliseconds)
   - Blockchain query chậm hơn (seconds)
   - Database có index, join, filter dễ dàng

2. **Data Rich:**
   - Database có thông tin user (email, full_name) từ join
   - Blockchain chỉ có address (0x123...)
   - Database có UUID reference dễ đọc hơn bytes32

3. **Pagination & Filtering:**
   - Database hỗ trợ limit, offset, where clause
   - Blockchain phải đọc tất cả rồi filter ở backend

4. **Blockchain vẫn quan trọng:**
   - **Audit**: So sánh database vs blockchain để phát hiện tampering
   - **Verification**: Verify transaction có tồn tại trên blockchain không
   - **Transparency**: Immutable record cho audit trail

### 2.5. Khi Nào Dùng Blockchain Data?

**Admin dashboard có thể hiển thị blockchain data khi:**

1. **Audit Check:**
   - Click "Run Full Audit" → So sánh database vs blockchain
   - Phát hiện mismatch (ví dụ: admin insert coin trực tiếp vào DB)

2. **Verify Transaction:**
   - Click vào transaction → Check xem có trên blockchain không
   - Hiển thị blockchain transaction ID nếu có

3. **Blockchain Transaction List:**
   - Có thể thêm tab "Blockchain Transactions"
   - Fetch từ `GET /api/blockchain/transactions/:txId`

**Ví dụ code để lấy blockchain transaction:**

```javascript
// admin-blockchain/index.html

async function loadBlockchainTransaction(txId) {
  try {
    const response = await fetch(`${API_URL}/blockchain/transactions/${txId}`);
    const data = await response.json();
    
    // data.transaction chứa:
    // {
    //   id: 5,
    //   user: "0x123...",
    //   transactionType: "spend",
    //   amount: 50.0,
    //   balanceBefore: 1000.0,
    //   balanceAfter: 950.0,
    //   description: "Purchase order #123",
    //   timestamp: 1705312200
    // }
    
    return data.transaction;
  } catch (error) {
    console.error('Error loading blockchain transaction:', error);
    return null;
  }
}
```

---

## 🔄 3. So Sánh Database vs Blockchain

| Tiêu chí | Database (Supabase) | Blockchain (Hardhat) |
|----------|---------------------|----------------------|
| **Tốc độ** | ⚡ Nhanh (ms) | 🐌 Chậm (s) |
| **Query** | ✅ SQL, Join, Filter | ❌ Chỉ đọc từng transaction |
| **Data Rich** | ✅ Có user info, UUID | ❌ Chỉ có address, bytes32 |
| **Pagination** | ✅ Limit, Offset | ❌ Phải đọc tất cả |
| **Immutable** | ❌ Có thể sửa/xóa | ✅ Không thể sửa/xóa |
| **Audit Trail** | ⚠️ Có thể bị tamper | ✅ Transparent, verifiable |
| **Cost** | 💰 Rẻ (Supabase free tier) | 💰 Tốn gas (nhưng local free) |

**Kết luận:**
- **Database**: Dùng cho UI, query, hiển thị (fast, rich data)
- **Blockchain**: Dùng cho audit, verification, transparency (immutable, verifiable)

---

## 📝 4. Tóm Tắt Flow Hoàn Chỉnh

### 4.1. Khi User Tạo Transaction

```
1. User Action (Frontend)
   ↓
2. Backend API
   ↓
3. transaction.service.ts: createTransaction()
   ├─→ Lưu vào Database (Supabase)
   │   └─→ INSERT INTO transactions (...)
   │
   └─→ Gọi blockchain.service.ts: registerTransaction()
       └─→ Gọi Smart Contract: TransactionRegistry.registerTransaction()
           └─→ Lưu vào Blockchain (mapping, event)
```

### 4.2. Khi Admin Xem Transactions

```
1. Admin mở Dashboard
   ↓
2. JavaScript: loadTransactions()
   ↓
3. Fetch: GET /api/admin/transactions
   ↓
4. Backend: admin.controller.ts: getAllTransactions()
   ↓
5. Query Database: SELECT * FROM transactions JOIN users
   ↓
6. Return JSON
   ↓
7. Frontend: displayDatabaseTransactions()
   ↓
8. Render HTML Table
```

### 4.3. Khi Admin Chạy Audit

```
1. Admin click "Run Full Audit"
   ↓
2. JavaScript: runAudit()
   ↓
3. Fetch: GET /api/admin/blockchain-audit/all
   ↓
4. Backend: blockchain-audit.service.ts: auditAllUsers()
   ├─→ Query Database: SELECT * FROM users
   │   └─→ Lấy balance, transaction count từ DB
   │
   └─→ Query Blockchain: getTokenBalance(), getUserTransactionIds()
       └─→ Lấy balance, transaction count từ blockchain
   ↓
5. So sánh Database vs Blockchain
   ↓
6. Return mismatch results
   ↓
7. Frontend: displayAuditResults()
   ↓
8. Hiển thị danh sách users có mismatch
```

---

## 🎯 5. Key Takeaways

1. **Blockchain lưu transaction:**
   - Dùng smart contract `TransactionRegistry.sol`
   - Lưu trong mapping `transactions[txId]` và `userTransactions[address]`
   - Immutable, permanent, transparent

2. **Admin dashboard hiển thị:**
   - **Chủ yếu từ Database** (fast, rich data, easy query)
   - **Blockchain dùng cho audit** (verify, detect tampering)

3. **Hai nguồn dữ liệu bổ sung nhau:**
   - Database = Fast, queryable, user-friendly
   - Blockchain = Immutable, verifiable, audit trail

4. **Best Practice:**
   - Ghi vào cả Database và Blockchain
   - Hiển thị từ Database (UI)
   - Verify bằng Blockchain (Audit)

---

## 📚 References

- [TransactionRegistry.sol](../blockchain/contracts/TransactionRegistry.sol)
- [blockchain.service.ts](../backend/src/services/blockchain.service.ts)
- [admin.controller.ts](../backend/src/controllers/admin.controller.ts)
- [admin-blockchain/index.html](../admin-blockchain/index.html)
- [BLOCKCHAIN_AUDIT_SYSTEM.md](./BLOCKCHAIN_AUDIT_SYSTEM.md)




