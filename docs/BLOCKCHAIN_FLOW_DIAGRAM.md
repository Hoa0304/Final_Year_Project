# Blockchain Flow Diagrams - HMall

## Tổng quan Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    HMall Blockchain Flow                     │
└─────────────────────────────────────────────────────────────┘

User Action
    │
    ▼
┌─────────────────┐
│  Backend API   │
│  (Express)     │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌──────────────┐   ┌──────────────┐
│  Database    │   │  Blockchain  │
│  (Supabase)  │   │  (Hardhat)   │
│              │   │              │
│  ✅ Fast     │   │  ✅ Immutable │
│  ✅ Query    │   │  ✅ Audit     │
│  ✅ Source   │   │  ✅ Verify    │
└──────────────┘   └──────────────┘
```

## Chi tiết Flow: Task Reward

```
┌─────────────────────────────────────────────────────────────┐
│              Task Reward Flow (Chi tiết)                    │
└─────────────────────────────────────────────────────────────┘

1. User Complete Task
   │
   ├─→ POST /api/tasks/:id/complete
   │
   ▼
2. Backend Validation
   │
   ├─→ Check task exists
   ├─→ Check requirements met
   └─→ Check not already completed
   │
   ▼
3. Blockchain Check (TaskRewardSystem)
   │
   ├─→ isTaskRewardClaimed(taskId, userAddress)
   │   └─→ Returns: false (OK) or true (Already claimed)
   │
   ▼
4. Claim on Blockchain
   │
   ├─→ claimTaskReward(taskId, userAddress, amount)
   │   └─→ Returns: TX Hash (0x...)
   │   └─→ Status: Claimed ✅
   │
   ▼
5. Database Transaction
   │
   ├─→ createTransaction({
   │       type: 'task_reward',
   │       amount: 100,
   │       ...
   │     })
   │   └─→ Updates: users.virtual_balance (+100)
   │   └─→ Creates: transactions record
   │
   ▼
6. Register on Blockchain (TransactionRegistry)
   │
   ├─→ registerTransaction({
   │       user: userAddress,
   │       transactionType: 'task_reward',
   │       amount: 100,
   │       balanceBefore: 1000,
   │       balanceAfter: 1100,
   │       ...
   │     })
   │   └─→ Returns: TX ID (123)
   │
   ▼
7. Mint Tokens (HMallToken)
   │
   ├─→ mint(userAddress, 100)
   │   └─→ Updates: Token balance (+100)
   │
   ▼
8. Success Response
   │
   └─→ { message: "Task completed", reward: 100 }
```

## Chi tiết Flow: Purchase Product

```
┌─────────────────────────────────────────────────────────────┐
│            Purchase Product Flow (Chi tiết)                 │
└─────────────────────────────────────────────────────────────┘

1. User Purchase Product
   │
   ├─→ POST /api/products/purchase
   │   Body: { productId, quantity }
   │
   ▼
2. Backend Validation
   │
   ├─→ Check product exists
   ├─→ Check stock available
   ├─→ Check user balance sufficient
   └─→ Calculate total amount
   │
   ▼
3. Database Transaction (ACID)
   │
   ├─→ BEGIN TRANSACTION
   │   ├─→ Create order
   │   ├─→ Update product stock
   │   ├─→ createTransaction({
   │   │       type: 'spend',
   │   │       amount: 50,
   │   │       ...
   │   │     })
   │   └─→ Update user balance (-50)
   │   └─→ COMMIT
   │
   ▼
4. Register on Blockchain (TransactionRegistry)
   │
   ├─→ registerTransaction({
   │       user: userAddress,
   │       transactionType: 'spend',
   │       amount: 50,
   │       balanceBefore: 1000,
   │       balanceAfter: 950,
   │       description: "Purchase: Virtual Laptop",
   │       referenceId: orderIdHash,
   │       referenceType: 'order'
   │     })
   │   └─→ Returns: TX ID (124)
   │
   ▼
5. Burn Tokens (HMallToken)
   │
   ├─→ burn(userAddress, 50)
   │   └─→ Updates: Token balance (-50)
   │
   ▼
6. Success Response
   │
   └─→ { message: "Purchase successful", order: {...} }
```

## Chi tiết Flow: Admin Grant Coins

```
┌─────────────────────────────────────────────────────────────┐
│            Admin Grant Coins Flow (Chi tiết)                │
└─────────────────────────────────────────────────────────────┘

1. Admin Grant Coins
   │
   ├─→ POST /api/admin/users/:id/coins
   │   Body: { amount: 500, description: "Bonus" }
   │
   ▼
2. Backend Validation
   │
   ├─→ Check admin role
   ├─→ Check user exists
   └─→ Validate amount
   │
   ▼
3. Database Transaction
   │
   ├─→ createTransaction({
   │       type: 'grant',
   │       amount: 500,
   │       createdBy: adminId,
   │       ...
   │     })
   │   └─→ Updates: users.virtual_balance (+500)
   │
   ▼
4. Register on Blockchain (TransactionRegistry)
   │
   ├─→ registerTransaction({
   │       user: userAddress,
   │       transactionType: 'grant',
   │       amount: 500,
   │       balanceBefore: 1000,
   │       balanceAfter: 1500,
   │       description: "Bonus",
   │       createdBy: adminAddress
   │     })
   │   └─→ Returns: TX ID (125)
   │   └─→ Note: createdBy field shows admin address
   │
   ▼
5. Mint Tokens (HMallToken)
   │
   ├─→ mint(userAddress, 500)
   │   └─→ Updates: Token balance (+500)
   │
   ▼
6. Success Response
   │
   └─→ { message: "Coins granted", newBalance: 1500 }
```

## Data Flow: Transaction Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│            Transaction Lifecycle                            │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│   User       │
│   Action     │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Backend Service                   │
│   transaction.service.ts            │
│                                     │
│   1. Validate                       │
│   2. Calculate balance              │
│   3. Save to Database               │
│   4. Register on Blockchain        │
│   5. Mint/Burn Tokens               │
└──────┬──────────────────────────────┘
       │
       ├──────────────────┬──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Database    │  │ Transaction  │  │  HMallToken  │
│              │  │  Registry    │  │              │
│  ✅ Fast     │  │              │  │              │
│  ✅ Query    │  │  ✅ Immutable │  │  ✅ Mint     │
│  ✅ Source   │  │  ✅ Audit    │  │  ✅ Burn     │
│              │  │  ✅ Verify   │  │  ✅ Balance  │
└──────────────┘  └──────────────┘  └──────────────┘
       │                  │                  │
       └──────────────────┴──────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │   Success    │
                  │   Response   │
                  └──────────────┘
```

## Blockchain Components Interaction

```
┌─────────────────────────────────────────────────────────────┐
│         Blockchain Components Interaction                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  Backend API    │
│  (Express)      │
└────────┬────────┘
         │
         │ Uses ethers.js
         │
         ▼
┌─────────────────────────────────────┐
│   Blockchain Service                │
│   blockchain.service.ts             │
│                                     │
│   - getProvider()                   │
│   - getWallet()                     │
│   - getContract()                   │
└────────┬────────────────────────────┘
         │
         ├──────────────┬──────────────┬──────────────┐
         │              │              │              │
         ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ HMallToken   │ │ Transaction  │ │ TaskReward   │ │ Hardhat Node │
│ Contract     │ │ Registry     │ │ System       │ │              │
│              │ │              │ │              │ │              │
│ - mint()     │ │ - register()  │ │ - claim()    │ │ - RPC        │
│ - burn()     │ │ - getTX()     │ │ - isClaimed()│ │ - Accounts   │
│ - balance()  │ │ - getUserTXs()│ │              │ │ - Blocks     │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Error Handling Flow                            │
└─────────────────────────────────────────────────────────────┘

Transaction Request
    │
    ▼
┌─────────────────┐
│  Try Database   │
│  Transaction    │
└────────┬────────┘
         │
         ├─→ Success ──┐
         │             │
         └─→ Error ────┼─→ Rollback ──→ Error Response
                       │
                       ▼
              ┌─────────────────┐
              │ Try Blockchain  │
              │ Registration    │
              └────────┬────────┘
                       │
                       ├─→ Success ──→ Success Response
                       │
                       └─→ Error ──→ Log Error
                                      │
                                      ▼
                              ┌─────────────────┐
                              │ Database OK     │
                              │ Blockchain Fail │
                              │ (Graceful Deg)  │
                              └─────────────────┘
```

## Summary

1. **User Action** → Backend API
2. **Backend** → Validate & Process
3. **Database** → Save transaction (source of truth)
4. **Blockchain** → Register transaction (audit trail)
5. **Token Contract** → Mint/Burn tokens
6. **Response** → Success/Error

**Key Points**:
- Database = Fast, queryable, source of truth
- Blockchain = Immutable, auditable, verification
- Hybrid approach = Best of both worlds






