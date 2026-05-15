# Quick Start Guide - HMall

Hướng dẫn nhanh để chạy lại project HMall sau khi đã setup.

## Thứ Tự Chạy (5 Terminals)

### Terminal 1: Supabase

```bash
cd supabase
supabase start
```

**Giữ terminal này chạy!** 

Kiểm tra:
- API: http://localhost:54330
- Studio: http://127.0.0.1:54332

---

### Terminal 2: Blockchain (Hardhat Node)

```bash
cd blockchain
npm run node
```

**Giữ terminal này chạy!**

**Lưu ý:**
- Nếu lần đầu hoặc reset blockchain, cần deploy contracts:
  ```bash
  # Terminal mới
  cd blockchain
  npm run deploy:local
  # Copy contract addresses và private key từ output
  # Cập nhật backend/.env với các addresses này
  ```

Kiểm tra:
- RPC: http://localhost:8545

---

### Terminal 3: Backend

```bash
cd backend
npm run dev
```

**Giữ terminal này chạy!**

Kiểm tra:
- API: http://localhost:3002
- Blockchain status: `curl http://localhost:3002/api/blockchain/status`

---

### Terminal 4: AI Service

```bash
cd ai-service
npm run dev
```

**Giữ terminal này chạy!**

**Lưu ý:**
- Lần đầu tiên cần train models: `npm run train` (có thể mất vài phút)
- Các lần sau chỉ cần: `npm run dev`

Kiểm tra:
- Service: http://localhost:3003

---

### Terminal 5: Frontend

```bash
cd frontend
npm run dev
```

**Hoặc dùng tunnel mode (cho mobile device):**
```bash
npm run dev:frontend
```

Quét QR code bằng Expo Go app.

---

## Tóm Tắt

```
1. Supabase      → cd supabase && supabase start
2. Blockchain    → cd blockchain && npm run node
3. Backend       → cd backend && npm run dev
4. AI Service    → cd ai-service && npm run dev
5. Frontend      → cd frontend && npm run dev
```

## Troubleshooting

### Lỗi: "Blockchain is not enabled"

1. Kiểm tra Hardhat node đang chạy:
   ```bash
   curl http://localhost:8545
   ```

2. Kiểm tra `backend/.env` có đầy đủ blockchain config:
   ```env
   BLOCKCHAIN_RPC_URL=http://localhost:8545
   BLOCKCHAIN_TOKEN_ADDRESS=0x...
   BLOCKCHAIN_REGISTRY_ADDRESS=0x...
   BLOCKCHAIN_TASK_SYSTEM_ADDRESS=0x...
   BLOCKCHAIN_PRIVATE_KEY=...
   ```

3. Restart backend server

### Lỗi: "Connection refused" (Supabase)

```bash
cd supabase
supabase start
```

### Lỗi: "Cannot connect to backend" (Frontend)

- Kiểm tra backend đang chạy: http://localhost:3002
- Nếu chạy trên mobile device, cần setup ngrok (xem README.md)

### Lỗi: "Failed to mint tokens"

- Kiểm tra Hardhat node đang chạy
- Kiểm tra contract addresses đúng trong `backend/.env`
- Kiểm tra private key đúng (Account #0 từ Hardhat node)

## Next Steps

- Xem [README.md](../README.md) để biết setup lần đầu
- Xem [BLOCKCHAIN_QUICK_START.md](./BLOCKCHAIN_QUICK_START.md) để biết chi tiết blockchain
- Xem [BLOCKCHAIN_SETUP.md](./BLOCKCHAIN_SETUP.md) để biết chi tiết blockchain setup






