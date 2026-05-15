# HMall - Virtual Currency Management & Simulated E-commerce Platform

## Overview

HMall is a comprehensive application for personal expense management combined with a simulated e-commerce platform using virtual currency. The app allows users to manage virtual finances safely, experience simulated buying/selling and stock trading, earn virtual coins through tasks, and receive AI suggestions for spending and investing.

## Features

- **Virtual Currency Management**: View, earn, spend, and track virtual coins
- **Simulated Marketplace**: Browse and purchase virtual products
- **Task System**: Complete tasks to earn virtual coins
- **Simulated Stock Trading**: Buy/sell stocks with simulated price fluctuations
- **AI Recommendations**: Personalized suggestions for spending and investing
- **User Management**: Registration, login, profile editing, transaction history
- **Admin Panel**: Manage users, products, tasks, and grant virtual coins
- **Reports & Statistics**: Expense and investment charts with trend visualizations
- **Blockchain Integration**: Immutable transaction audit trail using Hardhat local blockchain

## Tech Stack

### Frontend
- React Native (Expo)
- React Navigation
- React Query / SWR for data fetching
- AsyncStorage for local storage
- Expo Router (if using file-based routing)

### Backend
- Node.js with Express
- Supabase (PostgreSQL) for database
- JWT for authentication
- Firebase (optional) for realtime chat and notifications
- **Blockchain Integration**: Hardhat local blockchain for transaction audit trail

### AI Service
- Node.js-based recommendation engine
- Can be extended with external AI APIs

### Blockchain
- Hardhat local blockchain network
- Smart contracts: HMallToken, TransactionRegistry, TaskRewardSystem
- Ethers.js for blockchain interaction

### Database
- Supabase (PostgreSQL)
local development with Supabase CLI

## Project Structure

```
HMall/
├── frontend/              # React Native Expo app
│   ├── src/
│   │   ├── screens/      # Screen components
│   │   ├── components/   # Reusable components
│   │   ├── navigation/   # Navigation setup
│   │   ├── services/     # API services
│   │   ├── hooks/        # Custom hooks
│   │   ├── utils/        # Utility functions
│   │   └── types/        # TypeScript types
│   ├── app.json
│   └── package.json
├── backend/               # Express API server
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── controllers/  # Route controllers
│   │   ├── models/       # Data models
│   │   ├── middleware/   # Express middleware
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utility functions
│   ├── .env.example
│   └── package.json
├── ai-service/            # AI recommendation service
│   ├── src/
│   │   ├── recommendation/  # Recommendation engine
│   │   └── utils/
│   └── package.json
├── blockchain/           # Blockchain smart contracts
│   ├── contracts/        # Solidity smart contracts
│   ├── scripts/         # Deployment scripts
│   └── package.json
├── supabase/              # Supabase configuration
│   ├── migrations/        # Database migrations
│   └── config.toml
├── scripts/               # Utility scripts
│   ├── add-blockchain-config.ps1
│   ├── deploy-and-update-env.ps1
│   └── update-env-with-addresses.ps1
└── docs/                  # Documentation
    ├── SETUP.md          # Setup guide
    ├── SUPABASE_SETUP.md # Supabase connection guide
    ├── BLOCKCHAIN_QUICK_START.md
    └── NGROK_SETUP.md
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase CLI
- Expo CLI
- Git
- **ngrok** (cho mobile device testing - xem phần Setup ngrok)

## Quick Start

### Bước 1: Clone Repository

```bash
git clone <repository-url>
cd HMall
```

### Bước 2: Cài Đặt Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# AI Service
cd ../ai-service
npm install

# Blockchain
cd ../blockchain
npm install
```

### Bước 3: Setup Supabase

```bash
cd supabase
supabase start
```

**Lưu lại các thông tin từ output:**
- `anon key`
- `service_role key`
- `API URL`: http://localhost:54330

### Bước 4: Setup Backend Environment

#### Cách 1: Dùng Script Tự Động (Khuyến nghị)

```powershell
# PowerShell
cd backend

# Tạo file .env từ template (nếu chưa có)
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
}

# Thêm Supabase config (sau khi chạy supabase start)
# Mở .env and thêm:
# SUPABASE_URL=http://localhost:54330
# SUPABASE_ANON_KEY=<anon-key-từ-output>
# SUPABASE_SERVICE_ROLE_KEY=<service-role-key-từ-output>
```

#### Cách 2: Tạo Thủ Công

Tạo file `backend/.env` với nội dung:

```env
# Server Configuration
PORT=3002
NODE_ENV=development

# Supabase Configuration (lấy từ supabase start output)
SUPABASE_URL=http://localhost:54330
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# AI Service
AI_SERVICE_URL=http://localhost:3003

# CORS
CORS_ORIGIN=http://localhost:19006

# Cloudinary Configuration (optional - cho image upload)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Groq API (optional - cho AI Chat)
GROQ_API_KEY=

# Blockchain Configuration (sẽ được thêm sau khi deploy contracts)
# Xem phần Setup Blockchain bên dưới
```

### Bước 5: Setup Blockchain (Lần Đầu)

#### 5.1. Start Hardhat Node

```bash
# Terminal mới
cd blockchain
npm run node
```

**Giữ terminal này chạy!** Node sẽ chạy tại: http://localhost:8545

#### 5.2. Deploy Contracts

```bash
# Terminal mới (khác với terminal chạy node)
cd blockchain
npm run deploy:local
```

**Lưu lại các addresses từ output:**
```
HMallToken deployed to: 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
TransactionRegistry deployed to: 0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
TaskRewardSystem deployed to: 0x8A791620dd6260079BF849Dc5567aDC3F2FdC318
```

#### 5.3. Update Backend .env với Blockchain Config

**Cách 1: Dùng Script Tự Động (Khuyến nghị - Windows)**

```batch
REM Batch script (Windows) - Từ root directory
scripts\deploy-and-update-env.bat
```

Hoặc PowerShell:
```powershell
# PowerShell - Từ root directory
.\scripts\deploy-and-update-env.ps1
```

Script sẽ:
- ✅ Check Hardhat node đang chạy
- ✅ Deploy contracts
- ✅ Extract addresses từ output
- ✅ Tự động update `backend/.env`

**Cách 2: Chỉ Update .env (Sau khi đã deploy)**

```batch
REM Batch script (Windows)
scripts\update-env-with-addresses.bat
```

Hoặc PowerShell:
```powershell
# PowerShell
.\scripts\update-env-with-addresses.ps1
```

Script sẽ tự động:
- ✅ Update `backend/.env` với addresses mới từ lần deploy gần nhất
- ✅ Thêm blockchain configuration

**Cách 3: Thêm Thủ Công**

Thêm vào `backend/.env`:

```env
# Blockchain Configuration
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_TOKEN_ADDRESS=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
BLOCKCHAIN_REGISTRY_ADDRESS=0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
BLOCKCHAIN_TASK_SYSTEM_ADDRESS=0x8A791620dd6260079BF849Dc5567aDC3F2FdC318
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Lưu ý:** `BLOCKCHAIN_PRIVATE_KEY` là private key của Account #0 từ Hardhat node (default: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`)

### Bước 6: Setup Frontend Environment

Tạo file `frontend/.env`:

```env
# API URL
# Development (local):
EXPO_PUBLIC_API_URL=http://localhost:3002

# Mobile Device (cần ngrok):
# EXPO_PUBLIC_API_URL=https://abc123-def456.ngrok-free.app
```

**Lưu ý:** 
- Nếu chạy trên emulator/simulator → dùng `http://localhost:3002`
- Nếu chạy trên mobile device → cần setup ngrok (xem phần Setup ngrok)

### Bước 7: Setup ngrok (Chỉ Khi Chạy Trên Mobile Device)

**Khi nào cần ngrok?**
- ✅ Khi chạy frontend trên mobile device (không phải emulator/simulator)
- ✅ Khi frontend không thể kết nối đến `localhost:3002`

**Các bước:**

1. **Cài đặt ngrok** (nếu chưa có):
   ```powershell
   # Windows - Download từ https://ngrok.com/download
   # Hoặc dùng Chocolatey:
   choco install ngrok
   ```

2. **Đăng ký tài khoản ngrok** (miễn phí):
   - Truy cập: https://ngrok.com/signup
   - Lấy **authtoken** từ: https://dashboard.ngrok.com/get-started/your-authtoken

3. **Cấu hình ngrok** (chỉ cần làm một lần):
   ```powershell
   ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
   ```

4. **Khởi động ngrok** (Terminal mới):
   ```powershell
   ngrok http 3002
   ```

   **Copy URL** từ output (ví dụ: `https://abc123-def456.ngrok-free.app`)

5. **Cập nhật `frontend/.env`**:
   ```env
   EXPO_PUBLIC_API_URL=https://abc123-def456.ngrok-free.app
   ```
   ⚠️ **Lưu ý:** Dùng URL **https** (không phải http)

6. **Restart Expo**:
   ```powershell
   # Dừng Expo (Ctrl+C) và chạy lại:
   cd frontend
   npm run dev
   ```

**Kiểm tra:**
- Trong Expo logs sẽ thấy: `API_URL: https://abc123-def456.ngrok-free.app`
- Ngrok web interface: http://127.0.0.1:4040 (để xem requests)

📖 **Xem chi tiết:** [NGROK_SETUP.md](./NGROK_SETUP.md)

**Lưu ý quan trọng:**
- ⚠️ **KHÔNG cần ngrok cho AI Service** - Backend gọi AI service qua localhost (internal call)
- ⚠️ URL ngrok free plan sẽ thay đổi mỗi lần restart - cần cập nhật lại `.env`
- ✅ Ngrok chỉ cần cho backend - Frontend → Backend (qua ngrok) → AI Service (local)

---

## Chạy Lại Project (Sau Khi Đã Setup)

Khi đã setup xong, mỗi lần chạy lại project, làm theo thứ tự sau:

### Terminal 1: Supabase

```bash
cd supabase
supabase start
```

**Giữ terminal này chạy!** Supabase sẽ chạy tại:
- API: http://localhost:54330
- Studio: http://127.0.0.1:54332

### Terminal 2: Blockchain (Hardhat Node)

```bash
cd blockchain
npm run node
```

**Giữ terminal này chạy!** Blockchain node sẽ chạy tại:
- RPC: http://localhost:8545

**Lưu ý quan trọng:** 
- ⚠️ Mỗi lần restart Hardhat node, blockchain sẽ reset → Contracts mất
- ✅ **Cần deploy lại contracts** sau khi restart node:

**Windows (Batch script):**
```batch
REM Terminal mới (khác với terminal chạy node)
cd blockchain
npm run deploy:local

REM Sau đó update .env (dùng script tự động):
cd ..
scripts\deploy-and-update-env.bat
```

**Windows (PowerShell):**
```powershell
# Terminal mới (khác với terminal chạy node)
cd blockchain
npm run deploy:local

# Sau đó update .env (dùng script tự động):
cd ..
.\scripts\deploy-and-update-env.ps1
```

### Terminal 3: Backend

```bash
cd backend
npm run dev
```

Backend sẽ chạy tại: http://localhost:3002

**Kiểm tra blockchain status:**
```bash
curl http://localhost:3002/api/blockchain/status
```

**Test blockchain config:**
```bash
npm run test:blockchain
```

### Terminal 4: ngrok (Chỉ Khi Chạy Trên Mobile Device)

```powershell
ngrok http 3002
```

**Copy URL** và cập nhật `frontend/.env`:
```env
EXPO_PUBLIC_API_URL=https://abc123-def456.ngrok-free.app
```

**Lưu ý:** 
- URL ngrok thay đổi mỗi lần restart → cần cập nhật lại `.env`
- Nếu dùng emulator/simulator → **KHÔNG cần** ngrok

### Terminal 5: AI Service

```bash
cd ai-service
npm run dev
```

AI Service sẽ chạy tại: http://localhost:3003

**Lưu ý**: 
- Lần đầu tiên cần train models: `npm run train` (có thể mất vài phút)
- Các lần sau chỉ cần: `npm run dev`

### Terminal 6: Frontend

```bash
cd frontend
npm run dev
```

Frontend sẽ chạy với Expo. Quét QR code bằng Expo Go app.

**Lưu ý:**
- Nếu chạy trên emulator/simulator → Dùng `http://localhost:3002` trong `.env`
- Nếu chạy trên mobile device → Dùng ngrok URL trong `.env`

---

## Tóm Tắt Thứ Tự Chạy

```
1. Supabase (Terminal 1)
   └─→ cd supabase && supabase start

2. Blockchain Node (Terminal 2)
   └─→ cd blockchain && npm run node
   └─→ (Nếu restart node) npm run deploy:local
   └─→ (Update .env) powershell -ExecutionPolicy Bypass -File ..\scripts\update-env-with-addresses.ps1

3. Backend (Terminal 3)
   └─→ cd backend && npm run dev

4. ngrok (Terminal 4 - Chỉ khi chạy trên mobile device)
   └─→ ngrok http 3002
   └─→ Copy URL và update frontend/.env

5. AI Service (Terminal 5)
   └─→ cd ai-service && npm run dev

6. Frontend (Terminal 6)
   └─→ cd frontend && npm run dev
```

---

## Scripts Tiện Ích

### Blockchain Scripts (Windows)

**Batch Scripts (.bat) - Dễ chạy nhất:**
```batch
REM Deploy contracts và update .env tự động
scripts\deploy-and-update-env.bat

REM Chỉ update .env với addresses mới
scripts\update-env-with-addresses.bat

REM Thêm blockchain config (với addresses mặc định)
scripts\add-blockchain-config.bat
```

**PowerShell Scripts (.ps1):**
```powershell
# Deploy contracts và update .env tự động
.\scripts\deploy-and-update-env.ps1

# Chỉ update .env với addresses mới
.\scripts\update-env-with-addresses.ps1

# Thêm blockchain config
.\scripts\add-blockchain-config.ps1
```

**Backend Scripts:**
```bash
.\scripts\deploy-and-update-env.ps1
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Test blockchain config
cd backend
npm run test:blockchain

# Sync balances từ database lên blockchain
cd backend
npm run sync:balances
```

### Backend Scripts

```bash
# Test blockchain configuration
cd backend
npm run test:blockchain

# Sync user balances to blockchain
cd backend
npm run sync:balances
```

---

## 🔧 Troubleshooting Blockchain

### Vấn Đề: Token Balance = 0, Transactions Không Hiển Thị

**Nguyên nhân:** Hardhat node restart → Contracts mất → Cần deploy lại.

**Giải pháp nhanh:**

#### Cách 1: Script Tự Động (Khuyến nghị - Windows)

**Batch Script (Dễ nhất):**
```batch
REM Từ root directory
scripts\deploy-and-update-env.bat
```

**PowerShell Script:**
```powershell
# Từ root directory
.\scripts\deploy-and-update-env.ps1
```

Script sẽ tự động:
- ✅ Check Hardhat node đang chạy
- ✅ Deploy contracts
- ✅ Extract addresses từ output
- ✅ Update `backend/.env`

#### Cách 2: Deploy Thủ Công

**Windows:**
```batch
REM 1. Deploy contracts
cd blockchain
npm run deploy:local

REM 2. Update .env với script tự động
cd ..
scripts\update-env-with-addresses.bat

REM 3. Test
cd backend
npm run test:blockchain

REM 4. Restart backend
npm run dev
```

**Hoặc PowerShell:**
```powershell
# 1. Deploy contracts
cd blockchain
npm run deploy:local

# 2. Update .env với script tự động
cd ..
.\scripts\update-env-with-addresses.ps1

# 3. Test
cd backend
npm run test:blockchain

# 4. Restart backend
npm run dev
```

#### Sync Balances Cho Users Cũ

```bash
cd backend
npm run sync:balances
```

**Xem chi tiết:**
- [docs/BLOCKCHAIN_DEPLOY_AND_FIX.md](./docs/BLOCKCHAIN_DEPLOY_AND_FIX.md) - Deploy guide
- [docs/BLOCKCHAIN_DEBUG_GUIDE.md](./docs/BLOCKCHAIN_DEBUG_GUIDE.md) - Debug guide
- [docs/BLOCKCHAIN_TROUBLESHOOTING.md](./docs/BLOCKCHAIN_TROUBLESHOOTING.md) - Troubleshooting

---

## Admin Dashboard (Web)

### Mở Admin Blockchain Dashboard

#### Cách 1: Dùng Python Server (Khuyến nghị)

```bash
cd admin-blockchain
python -m http.server 8000
```

Sau đó mở browser và truy cập: **http://localhost:8000**

**Lưu ý:**
- Python 3: Dùng `python -m http.server 8000`
- Python 2: Dùng `python -m SimpleHTTPServer 8000`

#### Cách 2: Double-click File

Double-click vào file `admin-blockchain/index.html` trong file explorer.

#### Cách 3: Dùng Node.js Server

```bash
cd admin-blockchain
npx http-server -p 8000
```

Sau đó mở: **http://localhost:8000**

---

### Sử dụng Dashboard

1. **Nhập Admin Token**:
   - Login vào app với tài khoản admin (qua API hoặc frontend)
   - Copy JWT token từ login response
   - Paste token vào prompt khi mở dashboard lần đầu
   - Token được lưu trong localStorage (không cần nhập lại khi refresh)

2. **Tính năng Dashboard**:
   - ✅ **Blockchain Status**: Kiểm tra blockchain có enabled không
   - ✅ **Contract Addresses**: Xem các smart contract addresses
   - ✅ **Recent Transactions**: Xem tất cả transactions từ blockchain (mặc định) hoặc database
   - ✅ **Blockchain Audit**: Chạy audit để phát hiện mismatch giữa database và blockchain
   - ✅ **Stats**: Tổng số users, transactions, token supply
   - ✅ **Switch View**: Chuyển đổi giữa blockchain transactions và database transactions

---

## Environment Variables

### Backend (.env)

Xem phần **Bước 4: Setup Backend Environment** ở trên để biết cách tạo file `.env`.

**Các biến quan trọng:**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` - Từ `supabase start`
- `BLOCKCHAIN_*` - Từ `npm run deploy:local` (hoặc dùng script tự động)

### Frontend (.env)

```env
# Development (emulator/simulator)
EXPO_PUBLIC_API_URL=http://localhost:3002

# Mobile Device (cần ngrok)
# EXPO_PUBLIC_API_URL=https://abc123-def456.ngrok-free.app
```

---

## Documentation

- [docs/BLOCKCHAIN_QUICK_START.md](./docs/BLOCKCHAIN_QUICK_START.md) - Blockchain quick setup
- [docs/BLOCKCHAIN_DEPLOY_AND_FIX.md](./docs/BLOCKCHAIN_DEPLOY_AND_FIX.md) - Deploy và fix issues
- [docs/BLOCKCHAIN_DEBUG_GUIDE.md](./docs/BLOCKCHAIN_DEBUG_GUIDE.md) - Debug guide
- [docs/BLOCKCHAIN_TROUBLESHOOTING.md](./docs/BLOCKCHAIN_TROUBLESHOOTING.md) - Troubleshooting
- [NGROK_SETUP.md](./NGROK_SETUP.md) - Ngrok setup chi tiết
- [docs/QUICK_START.md](./docs/QUICK_START.md) - Quick start reference

---

## License

MIT
tats**: Tổng số users, transactions, token supply
   - ✅ **Switch View**: Chuyển đổi giữa blockchain transactions và database transactions

---

## Environment Variables

### Backend (.env)

Xem phần **Bước 4: Setup Backend Environment** ở trên để biết cách tạo file `.env`.

**Các biến quan trọng:**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` - Từ `supabase start`
- `BLOCKCHAIN_*` - Từ `npm run deploy:local` (hoặc dùng script tự động)

### Frontend (.env)

```env
# Development (emulator/simulator)
EXPO_PUBLIC_API_URL=http://localhost:3002

# Mobile Device (cần ngrok)
# EXPO_PUBLIC_API_URL=https://abc123-def456.ngrok-free.app
```

---

## Documentation

- [docs/BLOCKCHAIN_QUICK_START.md](./docs/BLOCKCHAIN_QUICK_START.md) - Blockchain quick setup
- [docs/BLOCKCHAIN_DEPLOY_AND_FIX.md](./docs/BLOCKCHAIN_DEPLOY_AND_FIX.md) - Deploy và fix issues
- [docs/BLOCKCHAIN_DEBUG_GUIDE.md](./docs/BLOCKCHAIN_DEBUG_GUIDE.md) - Debug guide
- [docs/BLOCKCHAIN_TROUBLESHOOTING.md](./docs/BLOCKCHAIN_TROUBLESHOOTING.md) - Troubleshooting
- [NGROK_SETUP.md](./NGROK_SETUP.md) - Ngrok setup chi tiết
- [docs/QUICK_START.md](./docs/QUICK_START.md) - Quick start reference

---

## License

MIT
