# HMall Blockchain Admin Dashboard

Giao diện web để admin xem và quản lý blockchain trong HMall.

## Cách sử dụng

### 1. Mở file HTML

#### Cách 1: Dùng Python Server (Khuyến nghị)

```bash
cd admin-blockchain
python -m http.server 8000
```

Sau đó mở browser: **http://localhost:8000**

**Lưu ý:**
- Python 3: `python -m http.server 8000`
- Python 2: `python -m SimpleHTTPServer 8000`

#### Cách 2: Double-click File

Double-click vào `admin-blockchain/index.html` trong file explorer.

#### Cách 3: Dùng Node.js Server

```bash
cd admin-blockchain
npx http-server -p 8000
```

Sau đó mở: **http://localhost:8000**

### 2. Nhập Admin Token

Khi mở lần đầu, sẽ hỏi JWT token. Lấy token bằng cách:

```bash
# Login as admin
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@HMall.com","password":"your-password"}'

# Copy token từ response
```

### 3. Xem Blockchain Data

Dashboard sẽ hiển thị:
- Blockchain status
- Contract addresses
- Recent transactions
- Flow diagram

## Features

- ✅ Real-time blockchain status
- ✅ Transaction history
- ✅ Contract addresses
- ✅ Flow visualization
- ✅ Responsive design

## Lưu ý

- Cần backend đang chạy (localhost:3002)
- Cần admin JWT token
- Cần blockchain đã được enable và configured


