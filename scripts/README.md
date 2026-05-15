# Scripts Tiện Ích - HMall

Các script tự động để setup và quản lý blockchain configuration.

## Windows Scripts

### Batch Scripts (.bat) - Dễ chạy nhất

Chỉ cần double-click hoặc chạy từ Command Prompt:

```batch
REM Deploy contracts và update .env tự động
scripts\deploy-and-update-env.bat

REM Chỉ update .env với addresses mới
scripts\update-env-with-addresses.bat

REM Thêm blockchain config (với addresses mặc định)
scripts\add-blockchain-config.bat
```

### PowerShell Scripts (.ps1)

Nếu muốn chạy trực tiếp PowerShell:

```powershell
# Deploy contracts và update .env tự động
.\scripts\deploy-and-update-env.ps1

# Chỉ update .env với addresses mới
.\scripts\update-env-with-addresses.ps1

# Thêm blockchain config
.\scripts\add-blockchain-config.ps1
```

**Nếu gặp lỗi Execution Policy:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Scripts Chi Tiết

### 1. deploy-and-update-env.bat / .ps1

**Mục đích:** Deploy contracts và tự động update `.env`

**Cách dùng:**
```batch
REM Batch
scripts\deploy-and-update-env.bat
```

```powershell
# PowerShell
.\scripts\deploy-and-update-env.ps1
```

**Chức năng:**
- ✅ Check Hardhat node đang chạy
- ✅ Deploy contracts
- ✅ Extract addresses từ output
- ✅ Tự động update `backend/.env`

### 2. update-env-with-addresses.bat / .ps1

**Mục đích:** Chỉ update `.env` với addresses mới (sau khi đã deploy)

**Cách dùng:**
```batch
REM Batch
scripts\update-env-with-addresses.bat
```

```powershell
# PowerShell
.\scripts\update-env-with-addresses.ps1
```

**Parameters (PowerShell):**
```powershell
.\scripts\update-env-with-addresses.ps1 `
  -TokenAddress "0x..." `
  -RegistryAddress "0x..." `
  -TaskSystemAddress "0x..."
```

**Chức năng:**
- ✅ Update `backend/.env` với addresses mới
- ✅ Thêm blockchain configuration

### 3. add-blockchain-config.bat / .ps1

**Mục đích:** Thêm blockchain config với addresses mặc định

**Cách dùng:**
```batch
REM Batch
scripts\add-blockchain-config.bat
```

```powershell
# PowerShell
.\scripts\add-blockchain-config.ps1
```

**Chức năng:**
- ✅ Thêm blockchain configuration vào `backend/.env`
- ✅ Sử dụng addresses mặc định từ Hardhat

## Troubleshooting

### Lỗi: "Execution Policy"

**Giải pháp:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Hoặc dùng batch scripts (.bat) thay vì PowerShell.

### Lỗi: "Hardhat node is not running"

**Giải pháp:**
1. Start Hardhat node:
   ```bash
   cd blockchain
   npm run node
   ```

2. Chạy lại script

### Lỗi: "Failed to extract contract addresses"

**Giải pháp:**
1. Deploy thủ công:
   ```bash
   cd blockchain
   npm run deploy:local
   ```

2. Copy addresses từ output

3. Dùng script `update-env-with-addresses.bat` với addresses mới

## Lưu Ý

- ⚠️ Scripts chỉ hoạt động trên **Windows**
- ⚠️ Cần chạy từ **root directory** của project
- ⚠️ Hardhat node phải đang chạy trước khi deploy
- ✅ Batch scripts (.bat) dễ chạy nhất - chỉ cần double-click





