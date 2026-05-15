# Vị trí Code Blockchain Ghi Nhận Transaction

Tài liệu này chỉ rõ **chỗ nào trong code** mà blockchain ghi nhận transaction.

## Flow Tổng Quan

```
User Action (Purchase, Task, etc.)
    ↓
Controller (product.controller.ts, task.controller.ts, etc.)
    ↓
Transaction Service (transaction.service.ts)
    ↓
Blockchain Service (blockchain.service.ts)
    ↓
Smart Contract (TransactionRegistry.sol)
    ↓
Blockchain (Hardhat Node)
```

## 1. Entry Point: Transaction Service

**File**: `backend/src/services/transaction.service.ts`

Đây là nơi **TẤT CẢ** transactions được tạo và ghi lên blockchain:

```77:112:backend/src/services/transaction.service.ts
  // Register transaction on blockchain if enabled
  if (isBlockchainEnabled()) {
    try {
      const userAddress = generateUserAddress(userId);
      const createdByAddress = createdBy ? generateUserAddress(createdBy) : undefined;

      // Register transaction on blockchain
      const blockchainTxId = await registerBlockchainTransaction({
        userAddress,
        transactionType: type,
        amount,
        balanceBefore,
        balanceAfter,
        description: description || '',
        referenceId: referenceId || undefined,
        referenceType: referenceType || undefined,
        createdByAddress,
      });

      // Update token balance on blockchain
      // Mint tokens for earning transactions
      if (type === 'earn' || type === 'grant' || type === 'task_reward' || type === 'stock_profit') {
        await mintTokens(userAddress, amount);
      }
      // Burn tokens for spending transactions
      else if (type === 'spend' || type === 'revoke' || type === 'stock_loss') {
        await burnTokens(userAddress, amount);
      }

      console.log(`Transaction ${data} registered on blockchain with ID: ${blockchainTxId}`);
    } catch (blockchainError: any) {
      // Log blockchain error but don't fail the transaction
      // Database transaction is already committed
      console.error('Blockchain registration error (transaction still saved to database):', blockchainError);
    }
  }
```

**Điểm quan trọng**:
- Dòng 78: Check `isBlockchainEnabled()` - chỉ ghi nếu blockchain được enable
- Dòng 84: Gọi `registerBlockchainTransaction()` - ghi transaction lên blockchain
- Dòng 98-104: Mint/Burn tokens tương ứng với transaction type

## 2. Implementation: Blockchain Service

**File**: `backend/src/services/blockchain.service.ts`

Function `registerTransaction()` thực sự gọi smart contract:

```161:205:backend/src/services/blockchain.service.ts
export async function registerTransaction(params: RegisterTransactionParams): Promise<number> {
  try {
    const registryAddress = config.blockchain?.registryAddress;
    if (!registryAddress) {
      throw new Error('BLOCKCHAIN_REGISTRY_ADDRESS not configured');
    }

    const registryContract = getContract(registryAddress, REGISTRY_ABI);
    
    // Convert amounts to wei
    const amountWei = ethers.parseEther(params.amount.toString());
    const balanceBeforeWei = ethers.parseEther(params.balanceBefore.toString());
    const balanceAfterWei = ethers.parseEther(params.balanceAfter.toString());

    // Convert reference ID to bytes32
    const referenceIdBytes32 = params.referenceId 
      ? uuidToBytes32(params.referenceId)
      : '0x0000000000000000000000000000000000000000000000000000000000000000';

    // Set createdBy to zero address if not provided
    const createdBy = params.createdByAddress || ethers.ZeroAddress;

    const tx = await registryContract.registerTransaction(
      params.userAddress,
      params.transactionType,
      amountWei,
      balanceBeforeWei,
      balanceAfterWei,
      params.description || '',
      referenceIdBytes32,
      params.referenceType || '',
      createdBy
    );

    const receipt = await tx.wait();
    
    // Get transaction ID from event or return receipt
    // For simplicity, we'll use the transaction count
    const txCount = await registryContract.transactionCount();
    return Number(txCount);
  } catch (error: any) {
    console.error('Blockchain register transaction error:', error);
    throw new Error(`Failed to register transaction: ${error.message}`);
  }
}
```

**Điểm quan trọng**:
- Dòng 168: Lấy contract instance từ address
- Dòng 171-173: Convert amounts sang wei (blockchain dùng wei)
- Dòng 183: **Gọi smart contract** `registerTransaction()`
- Dòng 195: Đợi transaction được confirm (`tx.wait()`)
- Dòng 199: Lấy transaction ID từ blockchain

## 3. Smart Contract

**File**: `blockchain/contracts/TransactionRegistry.sol`

Smart contract function nhận và lưu transaction:

```solidity
function registerTransaction(
    address user,
    string memory transactionType,
    uint256 amount,
    uint256 balanceBefore,
    uint256 balanceAfter,
    string memory description,
    bytes32 referenceId,
    string memory referenceType,
    address createdBy
) external returns (uint256) {
    transactionCount++;
    uint256 txId = transactionCount;

    Transaction memory newTx = Transaction({
        id: txId,
        user: user,
        transactionType: transactionType,
        amount: amount,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        description: description,
        referenceId: referenceId,
        referenceType: referenceType,
        createdBy: createdBy,
        timestamp: block.timestamp,
        exists: true
    });

    transactions[txId] = newTx;
    userTransactions[user].push(txId);

    emit TransactionRegistered(...);

    return txId;
}
```

## 4. Nơi Gọi Transaction Service

Tất cả các controllers gọi `createTransaction()` từ transaction service:

### a) Purchase Product
**File**: `backend/src/controllers/product.controller.ts`

```typescript
// Sau khi tạo order
await createTransaction({
  userId,
  type: 'spend',
  amount: totalAmount,
  description: `Purchase: ${product.name}`,
  referenceId: order.id,
  referenceType: 'order'
});
```

### b) Complete Task
**File**: `backend/src/controllers/task.controller.ts`

```typescript
// Sau khi claim task reward
await createTransaction({
  userId,
  type: 'task_reward',
  amount: task.reward_amount,
  description: `Task reward: ${task.title}`,
  referenceId: task.id,
  referenceType: 'task'
});
```

### c) Admin Grant Coins
**File**: `backend/src/controllers/admin.controller.ts`

```typescript
// Admin grant coins
await createTransaction({
  userId,
  type: 'grant',
  amount: absoluteAmount,
  description: description || `Admin grant by admin`,
  createdBy: adminId
});
```

### d) Stock Trading
**File**: `backend/src/controllers/stock.controller.ts`

```typescript
// Stock profit/loss
await createTransaction({
  userId,
  type: 'stock_profit' or 'stock_loss',
  amount: profitOrLoss,
  description: `Stock ${transactionType}: ${stock.symbol}`,
  referenceId: stockTransaction.id,
  referenceType: 'stock'
});
```

## 5. Mint/Burn Tokens

Sau khi register transaction, hệ thống tự động mint/burn tokens:

```98:104:backend/src/services/transaction.service.ts
      // Update token balance on blockchain
      // Mint tokens for earning transactions
      if (type === 'earn' || type === 'grant' || type === 'task_reward' || type === 'stock_profit') {
        await mintTokens(userAddress, amount);
      }
      // Burn tokens for spending transactions
      else if (type === 'spend' || type === 'revoke' || type === 'stock_loss') {
        await burnTokens(userAddress, amount);
      }
```

**Implementation**:

```typescript
// backend/src/services/blockchain.service.ts

export async function mintTokens(userAddress: string, amount: number): Promise<string> {
  const tokenContract = getContract(tokenAddress, TOKEN_ABI);
  const amountWei = ethers.parseEther(amount.toString());
  const tx = await tokenContract.mint(userAddress, amountWei);
  await tx.wait();
  return tx.hash;
}

export async function burnTokens(userAddress: string, amount: number): Promise<string> {
  const tokenContract = getContract(tokenAddress, TOKEN_ABI);
  const amountWei = ethers.parseEther(amount.toString());
  const tx = await tokenContract.burn(userAddress, amountWei);
  await tx.wait();
  return tx.hash;
}
```

## Tóm Tắt: Code Flow

```
1. Controller
   └─→ createTransaction() [transaction.service.ts:27]
       │
       ├─→ Save to Database [line 62]
       │
       └─→ if (isBlockchainEnabled()) [line 78]
           │
           ├─→ registerBlockchainTransaction() [line 84]
           │   └─→ blockchain.service.ts:161
           │       └─→ registryContract.registerTransaction() [line 183]
           │           └─→ Smart Contract: TransactionRegistry.sol
           │
           ├─→ mintTokens() [line 99] (nếu earn/grant/task_reward/stock_profit)
           │   └─→ tokenContract.mint() [blockchain.service.ts]
           │
           └─→ burnTokens() [line 103] (nếu spend/revoke/stock_loss)
               └─→ tokenContract.burn() [blockchain.service.ts]
```

## Điểm Quan Trọng

### 1. Tự động ghi
- **KHÔNG cần** gọi riêng blockchain API
- Mọi transaction qua `createTransaction()` đều tự động ghi blockchain

### 2. Graceful Degradation
- Nếu blockchain fail, database transaction vẫn được commit
- Không làm fail business logic

### 3. Single Source of Truth
- Database vẫn là source of truth
- Blockchain là audit trail bổ sung

### 4. Không thể bypass
- Nếu admin insert trực tiếp vào database (không qua API)
- → Transaction KHÔNG có trên blockchain
- → Audit system phát hiện ngay

## Test: Xem Blockchain Ghi Nhận

### 1. Mua sản phẩm
```bash
POST /api/products/purchase
```

**Check logs**:
```
Transaction <uuid> registered on blockchain with ID: 123
```

### 2. Check blockchain
```bash
GET /api/blockchain/transactions/:txId
```

### 3. Verify trong admin dashboard
- Mở `admin-blockchain/index.html`
- Click "Run Full Audit"
- Xem transactions có match không

## Kết Luận

**Blockchain ghi nhận transaction tại**:
1. **File chính**: `backend/src/services/transaction.service.ts` (dòng 77-112)
2. **Function**: `registerBlockchainTransaction()` trong `blockchain.service.ts`
3. **Smart Contract**: `TransactionRegistry.registerTransaction()`
4. **Tự động**: Mọi transaction qua API đều được ghi

**Không thể bypass** vì:
- Chỉ có thể ghi qua API (có blockchain recording)
- Insert trực tiếp vào database → Không có trên blockchain → Audit phát hiện





