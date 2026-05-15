# Hướng Dẫn Tạo và Đăng Nhập Vendor

## Tổng Quan

Vendor là role mới trong HMall, cho phép người dùng tạo và quản lý marketplace items (products). Vendor có thể:
- Tạo, sửa, xóa products của mình
- Xem marketplace
- Xem dashboard và profile

---

## Cách 1: Sử Dụng Script (Khuyến nghị)

### Bước 1: Chạy Script Tạo Vendor

```bash
cd backend
node scripts/create-vendor.js
```

Script sẽ hỏi:
- **Email** (mặc định: `vendor@HMall.com`) - Nhấn Enter để dùng mặc định hoặc nhập email khác
- **Password** - Nhập mật khẩu cho vendor (ví dụ: `vendor123`)

### Bước 2: Copy SQL và Chạy trong Supabase

Script sẽ tạo ra SQL statement, ví dụ:

```sql
INSERT INTO users (email, password_hash, full_name, role, virtual_balance)
VALUES (
    'vendor@HMall.com',
    '$2b$10$...',
    'Vendor User',
    'vendor',
    5000.00
);
```

### Bước 3: Chạy SQL trong Supabase Studio

1. Mở Supabase Studio: http://localhost:54332
2. Vào **SQL Editor**
3. Paste SQL từ bước 2
4. Click **Run** hoặc nhấn `Ctrl+Enter`

Hoặc chạy trực tiếp qua psql:
```bash
cd supabase
supabase db execute "INSERT INTO users ..."
```

---

## Cách 2: Tạo User Rồi Update Role

### Bước 1: Đăng Ký User Bình Thường

1. Mở app và đăng ký tài khoản mới với email/password bất kỳ
2. Hoặc dùng API:
```bash
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"vendor@HMall.com","password":"vendor123","fullName":"Vendor User"}'
```

### Bước 2: Update Role Thành Vendor

1. Mở Supabase Studio: http://localhost:54332
2. Vào **Table Editor** → chọn bảng `users`
3. Tìm user vừa tạo (theo email)
4. Click vào row đó để edit
5. Đổi `role` từ `user` thành `vendor`
6. Click **Save**

Hoặc chạy SQL:
```sql
UPDATE users 
SET role = 'vendor', virtual_balance = 5000.00
WHERE email = 'vendor@HMall.com';
```

---

## Đăng Nhập Vendor

### Bước 1: Mở App

1. Khởi động frontend:
```bash
cd frontend
npm start
```

2. Mở app trên điện thoại/emulator

### Bước 2: Đăng Nhập

1. Vào màn hình **Login**
2. Nhập:
   - **Email**: `vendor@HMall.com` (hoặc email bạn đã tạo)
   - **Password**: `vendor123` (hoặc password bạn đã set)
3. Click **Login**

### Bước 3: Vendor Panel Tự Động Hiển Thị

Sau khi đăng nhập thành công:
- Nếu role = `vendor`, app sẽ tự động hiển thị **Vendor Tab Navigator**
- Bạn sẽ thấy các tab:
  - **Dashboard** - Xem tổng quan tài khoản
  - **My Products** - Quản lý products của bạn (CRUD)
  - **Marketplace** - Xem marketplace
  - **Profile** - Thông tin cá nhân

---

## Kiểm Tra Vendor Đã Tạo Thành Công

### Cách 1: Kiểm Tra trong Supabase Studio

1. Mở Supabase Studio: http://localhost:54332
2. Vào **Table Editor** → `users`
3. Tìm user có `role = 'vendor'`
4. Kiểm tra các thông tin:
   - `email`: Email vendor
   - `role`: Phải là `'vendor'`
   - `virtual_balance`: Số dư (thường là 5000.00)

### Cách 2: Test API Login

```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vendor@HMall.com","password":"vendor123"}'
```

Response sẽ có:
```json
{
  "message": "Login successful",
  "user": {
    "id": "...",
    "email": "vendor@HMall.com",
    "role": "vendor",  // ← Phải là "vendor"
    "balance": 5000.00
  },
  "token": "..."
}
```

### Cách 3: Test Vendor API

Sau khi login, lấy token và test vendor endpoint:

```bash
# Lưu token từ response login
TOKEN="your-vendor-token-here"

# Test vendor products endpoint
curl -X GET http://localhost:3002/api/vendor/products \
  -H "Authorization: Bearer $TOKEN"
```

Nếu thành công, bạn sẽ nhận được danh sách products của vendor. Nếu lỗi 403, có nghĩa là role chưa đúng.

---

## Vendor Features

### 1. My Products Management
- **Xem danh sách products** của bạn
- **Tạo product mới** - Click nút "+" ở góc trên bên phải
- **Sửa product** - Click icon bút chì trên product card
- **Xóa product** - Click icon thùng rác trên product card (soft delete)

### 2. Create Product
Khi tạo product, bạn cần nhập:
- **Product Name** * (bắt buộc)
- **Description** (tùy chọn)
- **Price** * (bắt buộc)
- **Stock Quantity** (mặc định: 0)
- **Category** (tùy chọn)
- **Image URL** (tùy chọn)

### 3. Edit Product
- Vendor chỉ có thể sửa products của chính mình
- Không thể thay đổi trạng thái `is_active` (chỉ admin mới có thể)

### 4. Delete Product
- Soft delete (set `is_active = false`)
- Vendor chỉ có thể xóa products của chính mình

---

## Troubleshooting

### Vấn đề: Đăng nhập thành công nhưng không thấy Vendor Panel

**Nguyên nhân**: Role chưa được set thành `'vendor'`

**Giải pháp**:
1. Kiểm tra trong database:
```sql
SELECT email, role FROM users WHERE email = 'vendor@HMall.com';
```

2. Nếu role = `'user'`, update lại:
```sql
UPDATE users SET role = 'vendor' WHERE email = 'vendor@HMall.com';
```

3. Logout và login lại trong app

### Vấn đề: Script create-vendor.js không chạy

**Nguyên nhân**: Thiếu dependencies

**Giải pháp**:
```bash
cd backend
npm install
```

### Vấn đề: Không thể tạo product

**Nguyên nhân**: 
- Chưa đăng nhập
- Token hết hạn
- Role không phải vendor

**Giải pháp**:
1. Kiểm tra đã đăng nhập chưa
2. Logout và login lại
3. Kiểm tra role trong database

### Vấn đề: Không thể sửa/xóa product của vendor khác

**Đây là hành vi đúng**: Vendor chỉ có thể quản lý products của chính mình. Nếu cần sửa/xóa products của vendor khác, phải dùng admin account.

---

## So Sánh Roles

| Feature | User | Vendor | Admin |
|---------|------|--------|-------|
| Xem marketplace | ✅ | ✅ | ✅ |
| Mua products | ✅ | ✅ | ✅ |
| Tạo products | ❌ | ✅ (chỉ của mình) | ✅ (tất cả) |
| Sửa products | ❌ | ✅ (chỉ của mình) | ✅ (tất cả) |
| Xóa products | ❌ | ✅ (chỉ của mình) | ✅ (tất cả) |
| Quản lý tasks | ❌ | ❌ | ✅ |
| Grant/revoke coins | ❌ | ❌ | ✅ |
| Quản lý users | ❌ | ❌ | ✅ |

---

## Lưu Ý Bảo Mật

⚠️ **QUAN TRỌNG**:
- Đổi mật khẩu vendor mặc định trong production
- Vendor chỉ có thể quản lý products của chính mình
- Admin có thể quản lý tất cả products
- Không commit password vào git

---

## Tóm Tắt Nhanh

```bash
# 1. Tạo vendor user
cd backend
node scripts/create-vendor.js
# Nhập email và password

# 2. Copy SQL và chạy trong Supabase Studio
# http://localhost:54332 → SQL Editor → Paste SQL → Run

# 3. Đăng nhập trong app
# Email: vendor@HMall.com
# Password: (password bạn đã nhập)

# 4. Vendor panel sẽ tự động hiển thị!
```

---

## Liên Kết Hữu Ích

- [HUONG_DAN_ADMIN.md](./HUONG_DAN_ADMIN.md) - Hướng dẫn admin
- [QUICK_START.md](../QUICK_START.md) - Hướng dẫn setup nhanh
- [TESTING_GUIDE.md](../TESTING_GUIDE.md) - Hướng dẫn test


