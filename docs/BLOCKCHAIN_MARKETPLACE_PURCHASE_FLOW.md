# Blockchain xử lý giao dịch khi User mua hàng từ Vendor

Tài liệu này giải thích chi tiết cách blockchain xử lý transaction khi 1 user mua 1 vật phẩm từ market của 1 vendor.

---

## 📋 Tổng Quan

Khi user mua hàng từ vendor:
- **User**: Bị trừ coin (spend transaction)
- **Vendor**: Không nhận coin tự động (chỉ có random voucher cho user nếu có)
- **Blockchain**: Ghi nhận transaction `spend` và burn tokens

---

## 🔄 Flow Chi Tiết

### 1. User Mua Hàng (Frontend)

```typescript
// frontend/src/screens/detail/ProductDetailScreen.tsx

const purchaseMutation = useMutation({
  mutationFn: (params: { productId: string; quantity?: number }) => {
    return purchaseProduct(params);
  },
  onSuccess: (data) => {
    // Show success message
    // Refresh balance
    // Navigate back
  }
});
```

**API Call:**
```javascript
POST /api/products/purchase
Body: {
  productId: "123e4567-e89b-12d3-a456-426614174000",
  quantity: 1,
  voucher_code: "SAVE10" // optional
}
```

---

### 2. Backend Xử Lý Purchase

**File:** `backend/src/controllers/product.controller.ts`

#### Bước 2.1: Validate Product

```typescript
// Get product details
const { data: product, error: productError } = await supabase
  .from('products')
  .select('*')
  .eq('id', productId)
  .eq('is_active', true)
  .single();

// Check stock
if (product.stock_quantity < quantity) {
  return res.status(400).json({ error: 'Insufficient stock' });
}
```

**Product có thông tin:**
- `id`: Product UUID
- `name`: Tên sản phẩm
- `price`: Giá gốc
- `discount_percentage`: % giảm giá (nếu có)
- `stock_quantity`: Số lượng tồn kho
- `created_by`: Vendor ID (người tạo sản phẩm)

#### Bước 2.2: Tính Toán Giá

```typescript
// Calculate discounted price
const discountedPrice = calculateDiscountedPrice(
  product.price,
  product.discount_percentage
);
const originalAmount = discountedPrice * quantity;
let totalAmount = originalAmount;

// Apply voucher discount if provided
if (voucher_code) {
  const discountAmount = calculateVoucherDiscount(voucher, originalAmount);
  totalAmount = Math.max(0, originalAmount - discountAmount);
}
```

**Ví dụ:**
- Product price: 100 coins
- Discount: 10% → Discounted price: 90 coins
- Voucher: -20 coins → Final: 70 coins

#### Bước 2.3: Kiểm Tra Balance

```typescript
// Get user balance
const { data: user } = await supabase
  .from('users')
  .select('virtual_balance')
  .eq('id', userId)
  .single();

// Check if user has sufficient balance
if (user.virtual_balance < totalAmount) {
  return res.status(400).json({ error: 'Insufficient balance' });
}
```

**Ví dụ:**
- User balance: 1000 coins
- Total amount: 70 coins
- ✅ Có đủ tiền

#### Bước 2.4: Tạo Order

```typescript
// Create order in database
const { data: order, error: orderError } = await supabase
  .from('orders')
  .insert({
    user_id: userId,
    product_id: productId,
    quantity,
    total_amount: totalAmount,
    status: 'completed'
  })
  .select()
  .single();
```

**Order được tạo với:**
- `id`: Order UUID (dùng làm referenceId cho transaction)
- `user_id`: User ID
- `product_id`: Product ID
- `quantity`: Số lượng
- `total_amount`: Tổng tiền phải trả
- `status`: 'completed'

#### Bước 2.5: Cập Nhật Stock

```typescript
// Update product stock
await supabase
  .from('products')
  .update({ stock_quantity: product.stock_quantity - quantity })
  .eq('id', productId);
```

#### Bước 2.6: Redeem Voucher (nếu có)

```typescript
if (voucherToApply) {
  await redeemVoucher({
    voucher_id: voucherToApply.id,
    user_id: userId,
    original_amount: originalAmount,
    reference_id: order.id,
    reference_type: 'order'
  });
}
```

---

### 3. Tạo Transaction (Ghi Nhận Blockchain)

**File:** `backend/src/controllers/product.controller.ts`

```typescript
// Create transaction
await createTransaction({
  userId,
  type: 'spend',
  amount: totalAmount,
  description: `Purchased ${quantity}x ${product.name}${appliedVoucher ? ` (Voucher: ${appliedVoucher.code})` : ''}`,
  referenceId: order.id,
  referenceType: 'order'
});
```

**Tham số:**
- `userId`: User ID (người mua)
- `type`: 'spend' (trừ coin)
- `amount`: Tổng tiền phải trả (sau voucher)
- `description`: Mô tả transaction
- `referenceId`: Order ID (link đến order)
- `referenceType`: 'order'

---

### 4. Transaction Service Xử Lý

**File:** `backend/src/services/transaction.service.ts`

#### Bước 4.1: Validate và Tính Balance

```typescript
export async function createTransaction(params: CreateTransactionParams) {
  const { userId, type, amount, description, referenceId, referenceType } = params;

  // Get current balance
  const { data: user } = await supabase
    .from('users')
    .select('virtual_balance')
    .eq('id', userId)
    .single();

  const balanceBefore = user.virtual_balance;
  
  // Calculate balance after
  if (type === 'spend') {
    balanceAfter = balanceBefore - amount; // Trừ coin
  }
  
  // Check sufficient balance
  if (type === 'spend' && user.virtual_balance < amount) {
    throw new Error('Insufficient balance');
  }
```

**Ví dụ:**
- Balance before: 1000 coins
- Amount: 70 coins
- Balance after: 930 coins

#### Bước 4.2: Lưu vào Database (ACID)

```typescript
// Call database function to create transaction atomically
const { data, error } = await supabase.rpc('create_transaction', {
  p_user_id: userId,
  p_type: type,
  p_amount: amount,
  p_description: description || null,
  p_reference_id: referenceId || null,
  p_reference_type: referenceType || null,
  p_created_by: null // Không có admin tạo transaction này
});
```

**Database function `create_transaction`:**
- Tạo transaction record
- Cập nhật user balance
- Đảm bảo ACID (atomic, consistent, isolated, durable)

#### Bước 4.3: Ghi Nhận Blockchain

```typescript
// Register transaction on blockchain if enabled
if (isBlockchainEnabled()) {
  try {
    // Generate user blockchain address từ user ID
    const userAddress = generateUserAddress(userId);
    
    // Register transaction on blockchain
    const blockchainTxId = await registerBlockchainTransaction({
      userAddress,              // 0x123... (từ user ID)
      transactionType: 'spend',
      amount: 70,
      balanceBefore: 1000,
      balanceAfter: 930,
      description: 'Purchased 1x iPhone 15 (Voucher: SAVE10)',
      referenceId: order.id,   // Order UUID → bytes32
      referenceType: 'order',
      createdByAddress: undefined // Không có admin
    });

    // Burn tokens on blockchain (trừ token)
    await burnTokens(userAddress, 70);

    console.log(`Transaction registered on blockchain with ID: ${blockchainTxId}`);
  } catch (blockchainError) {
    // Log error but don't fail the transaction
    // Database transaction is already committed
    console.error('Blockchain registration error:', blockchainError);
  }
}
```

---

### 5. Blockchain Service Xử Lý

**File:** `backend/src/services/blockchain.service.ts`

#### Bước 5.1: Register Transaction

```typescript
export async function registerTransaction(params: RegisterTransactionParams): Promise<number> {
  const registryContract = getContract(registryAddress, REGISTRY_ABI);
  
  // Convert amounts to wei (blockchain dùng wei, không dùng decimal)
  const amountWei = ethers.parseEther(params.amount.toString());
  // 70 coins → 70000000000000000000 wei (70 * 10^18)
  
  const balanceBeforeWei = ethers.parseEther(params.balanceBefore.toString());
  // 1000 coins → 1000000000000000000000 wei
  
  const balanceAfterWei = ethers.parseEther(params.balanceAfter.toString());
  // 930 coins → 930000000000000000000 wei

  // Convert UUID to bytes32
  const referenceIdBytes32 = uuidToBytes32(params.referenceId);
  // "123e4567-e89b-12d3-a456-426614174000" → "0x123e4567e89b12d3a4564266141740000000000000000000000000000000000"

  // Gọi smart contract
  const tx = await registryContract.registerTransaction(
    params.userAddress,        // 0xabc123... (từ user ID)
    'spend',                   // Transaction type
    amountWei,                 // 70000000000000000000
    balanceBeforeWei,           // 1000000000000000000000
    balanceAfterWei,            // 930000000000000000000
    params.description,         // "Purchased 1x iPhone 15 (Voucher: SAVE10)"
    referenceIdBytes32,         // 0x123e4567...
    'order',                    // Reference type
    ethers.ZeroAddress          // 0x000... (không có admin)
  );

  const receipt = await tx.wait(); // Đợi transaction được confirm
  
  // Lấy transaction ID từ blockchain
  const txCount = await registryContract.transactionCount();
  return Number(txCount); // Ví dụ: 5
}
```

#### Bước 5.2: Smart Contract Lưu Transaction

**File:** `blockchain/contracts/TransactionRegistry.sol`

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
    transactionCount++; // Tăng counter
    uint256 txId = transactionCount; // ID mới: 5

    Transaction memory newTx = Transaction({
        id: txId,                    // 5
        user: user,                  // 0xabc123...
        transactionType: "spend",    // "spend"
        amount: amountWei,           // 70000000000000000000
        balanceBefore: balanceBeforeWei, // 1000000000000000000000
        balanceAfter: balanceAfterWei,  // 930000000000000000000
        description: description,     // "Purchased 1x iPhone 15..."
        referenceId: referenceIdBytes32, // 0x123e4567...
        referenceType: "order",       // "order"
        createdBy: ethers.ZeroAddress, // 0x000...
        timestamp: block.timestamp,   // 1705312200
        exists: true
    });

    // Lưu vào mapping
    transactions[5] = newTx;
    userTransactions[0xabc123...].push(5);

    // Emit event
    emit TransactionRegistered(...);

    return txId; // 5
}
```

**Storage trên Blockchain:**
- `transactions[5]` = Transaction struct
- `userTransactions[0xabc123...]` = [1, 3, 5] (danh sách transaction IDs)

#### Bước 5.3: Burn Tokens

```typescript
// Burn tokens for spending transactions
if (type === 'spend') {
  await burnTokens(userAddress, amount);
}
```

**File:** `backend/src/services/blockchain.service.ts`

```typescript
export async function burnTokens(userAddress: string, amount: number): Promise<string> {
  const tokenContract = getContract(tokenAddress, TOKEN_ABI);
  const amountWei = ethers.parseEther(amount.toString());
  
  // Gọi smart contract burn function
  const tx = await tokenContract.burn(userAddress, amountWei);
  await tx.wait();
  
  return tx.hash;
}
```

**Smart Contract:** `blockchain/contracts/HMallToken.sol`

```solidity
function burn(address from, uint256 amount) external {
    require(balances[from] >= amount, "Insufficient balance");
    balances[from] -= amount;
    totalSupply -= amount;
    emit Transfer(from, address(0), amount);
}
```

**Kết quả:**
- User balance trên blockchain: 1000 → 930 tokens
- Total supply: Giảm 70 tokens

---

### 6. Random Voucher (Bonus)

**File:** `backend/src/controllers/product.controller.ts`

```typescript
// Random voucher after purchase (if product has a vendor)
let randomVoucher = null;
if (product.created_by) { // Nếu có vendor
  try {
    randomVoucher = await randomVoucherAfterPurchase(
      product.created_by, // Vendor ID
      userId,
      productId
    );
    if (randomVoucher) {
      console.log('🎁 Random voucher issued:', randomVoucher.code);
    }
  } catch (voucherError) {
    // Don't fail the purchase if random voucher fails
    console.error('Failed to issue random voucher:', voucherError);
  }
}
```

**Lưu ý:**
- Vendor không nhận coin từ việc bán hàng
- Chỉ có random voucher được issue cho user (nếu vendor có setup)
- Voucher này không liên quan đến blockchain transaction

---

## 📊 Tóm Tắt Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User mua hàng (Frontend)                                 │
│    POST /api/products/purchase                               │
│    { productId, quantity, voucher_code }                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Backend Validate                                         │
│    - Check product exists & active                          │
│    - Check stock                                             │
│    - Check user balance                                      │
│    - Calculate price (discount + voucher)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Create Order (Database)                                  │
│    INSERT INTO orders (...)                                 │
│    - user_id, product_id, quantity, total_amount            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Update Stock (Database)                                  │
│    UPDATE products SET stock_quantity = ...                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Create Transaction (Database)                           │
│    createTransaction({                                       │
│      type: 'spend',                                         │
│      amount: 70,                                            │
│      referenceId: order.id,                                 │
│      referenceType: 'order'                                 │
│    })                                                        │
│    → Lưu vào transactions table                            │
│    → Update user balance: 1000 → 930                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Register on Blockchain                                   │
│    registerBlockchainTransaction({                          │
│      userAddress: 0xabc123...,                             │
│      transactionType: 'spend',                              │
│      amount: 70,                                            │
│      balanceBefore: 1000,                                   │
│      balanceAfter: 930,                                     │
│      referenceId: order.id (→ bytes32),                    │
│      referenceType: 'order'                                 │
│    })                                                        │
│    → Smart Contract: TransactionRegistry.registerTransaction│
│    → Lưu vào transactions[5]                              │
│    → Lưu vào userTransactions[0xabc123...].push(5)        │
│    → Emit TransactionRegistered event                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Burn Tokens (Blockchain)                                 │
│    burnTokens(userAddress, 70)                              │
│    → Smart Contract: HMallToken.burn()                     │
│    → balances[0xabc123...] -= 70                           │
│    → totalSupply -= 70                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Random Voucher (Optional)                               │
│    randomVoucherAfterPurchase(vendorId, userId, productId)  │
│    → Issue voucher cho user (nếu vendor có setup)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. Send Notification                                        │
│    sendNotification(userId, {                               │
│      title: 'Order Completed',                              │
│      message: 'Your order has been completed...'           │
│    })                                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. Return Success Response                                 │
│     {                                                        │
│       message: 'Product purchased successfully',            │
│       order: { id, product, quantity, totalAmount, ... }   │
│     }                                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Chi Tiết Blockchain Transaction

### Transaction trên Blockchain

**Transaction ID:** 5 (tự động tăng)

**Transaction Data:**
```solidity
{
  id: 5,
  user: 0xabc123...,                    // User blockchain address
  transactionType: "spend",             // Loại transaction
  amount: 70000000000000000000,         // 70 coins (wei)
  balanceBefore: 1000000000000000000000, // 1000 coins (wei)
  balanceAfter: 930000000000000000000,   // 930 coins (wei)
  description: "Purchased 1x iPhone 15 (Voucher: SAVE10)",
  referenceId: 0x123e4567...,          // Order UUID (bytes32)
  referenceType: "order",               // Reference type
  createdBy: 0x0000000000000000000000000000000000000000, // Zero address
  timestamp: 1705312200,                // Unix timestamp
  exists: true
}
```

### Token Balance trên Blockchain

**Trước khi mua:**
- User balance: 1000 tokens
- Total supply: 100000 tokens

**Sau khi mua:**
- User balance: 930 tokens (-70)
- Total supply: 99930 tokens (-70)

---

## ❓ Câu Hỏi Thường Gặp

### Q1: Vendor có nhận coin không?

**A:** Không. Trong hệ thống hiện tại:
- User bị trừ coin (spend transaction)
- Vendor không nhận coin tự động
- Chỉ có random voucher được issue cho user (nếu vendor có setup)

**Lý do:**
- Hệ thống là virtual currency, không phải real money
- Vendor có thể nhận coin thông qua admin grant hoặc task reward
- Random voucher là incentive để user mua hàng

### Q2: Blockchain ghi nhận gì?

**A:** Blockchain ghi nhận:
- Transaction `spend` của user
- Amount, balance before/after
- Reference đến order (order.id → bytes32)
- Timestamp tự động

**Không ghi nhận:**
- Vendor information (chỉ có trong product.created_by ở database)
- Voucher details (chỉ có trong database)

### Q3: Nếu blockchain fail thì sao?

**A:** Hệ thống có **graceful degradation**:
- Database transaction vẫn được commit (ACID)
- User balance vẫn được cập nhật
- Order vẫn được tạo
- Blockchain error chỉ được log, không fail purchase

**Lý do:**
- Database là source of truth
- Blockchain là audit trail (optional)
- Nếu blockchain down, hệ thống vẫn hoạt động

### Q4: Làm sao verify transaction trên blockchain?

**A:** Có thể verify bằng:
1. **Admin Dashboard**: Run Full Audit
2. **API**: `GET /api/blockchain/transactions/:txId`
3. **Smart Contract**: `TransactionRegistry.getTransaction(txId)`

**Ví dụ:**
```typescript
// Get transaction từ blockchain
const tx = await getBlockchainTransaction(5);
// {
//   id: 5,
//   user: "0xabc123...",
//   transactionType: "spend",
//   amount: 70,
//   balanceBefore: 1000,
//   balanceAfter: 930,
//   description: "Purchased 1x iPhone 15...",
//   timestamp: 1705312200
// }
```

---

## 📚 References

- [product.controller.ts](../backend/src/controllers/product.controller.ts) - Purchase logic
- [transaction.service.ts](../backend/src/services/transaction.service.ts) - Transaction creation
- [blockchain.service.ts](../backend/src/services/blockchain.service.ts) - Blockchain interaction
- [TransactionRegistry.sol](../blockchain/contracts/TransactionRegistry.sol) - Smart contract
- [HMallToken.sol](../blockchain/contracts/HMallToken.sol) - Token contract
- [BLOCKCHAIN_TRANSACTION_STORAGE_AND_UI.md](./BLOCKCHAIN_TRANSACTION_STORAGE_AND_UI.md) - Transaction storage details





