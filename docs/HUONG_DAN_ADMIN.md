# Hướng Dẫn Tạo và Đăng Nhập Admin

## Tổng Quan

Để vào admin panel trong HMall, bạn cần:
1. Tạo tài khoản admin trong database
2. Đăng nhập bằng email/password của admin
3. Hệ thống sẽ tự động hiển thị admin panel nếu role = 'admin'

---

## Cách 1: Sử Dụng Script (Khuyến nghị)

### Bước 1: Chạy Script Tạo Admin

```bash
cd backend
node scripts/create-admin.js
```

Script sẽ hỏi:
- **Email** (mặc định: `admin@HMall.com`) - Nhấn Enter để dùng mặc định hoặc nhập email khác
- **Password** - Nhập mật khẩu cho admin (ví dụ: `admin123`)

### Bước 2: Copy SQL và Chạy trong Supabase

Script sẽ tạo ra SQL statement, ví dụ:

```sql
INSERT INTO users (email, password_hash, full_name, role, virtual_balance)
VALUES (
    'admin@HMall.com',
    '$2b$10$...',
    'Admin User',
    'admin',
    100000.00
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
  -d '{"email":"admin@HMall.com","password":"admin123","fullName":"Admin User"}'
```

### Bước 2: Update Role Thành Admin

1. Mở Supabase Studio: http://localhost:54332
2. Vào **Table Editor** → chọn bảng `users`
3. Tìm user vừa tạo (theo email)
4. Click vào row đó để edit
5. Đổi `role` từ `user` thành `admin`
6. Click **Save**

Hoặc chạy SQL:
```sql
UPDATE users 
SET role = 'admin', virtual_balance = 100000.00
WHERE email = 'admin@HMall.com';
```

---

## Đăng Nhập Admin

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
   - **Email**: `admin@HMall.com` (hoặc email bạn đã tạo)
   - **Password**: `admin123` (hoặc password bạn đã set)
3. Click **Login**

### Bước 3: Vào Admin Panel

Sau khi đăng nhập thành công:
- Nếu role = `admin`, app sẽ tự động hiển thị **Admin Tab Navigator**
- Bạn sẽ thấy các tab:
  - **Dashboard** - Thống kê hệ thống
  - **Products** - Quản lý sản phẩm
  - **Tasks** - Quản lý nhiệm vụ
  - **Users** - Quản lý người dùng

---

## Kiểm Tra Admin Đã Tạo Thành Công

### Cách 1: Kiểm Tra trong Supabase Studio

1. Mở Supabase Studio: http://localhost:54332
2. Vào **Table Editor** → `users`
3. Tìm user có `role = 'admin'`
4. Kiểm tra các thông tin:
   - `email`: Email admin
   - `role`: Phải là `'admin'`
   - `virtual_balance`: Số dư (thường là 100000.00)

### Cách 2: Test API Login

```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@HMall.com","password":"admin123"}'
```

Response sẽ có:
```json
{
  "message": "Login successful",
  "user": {
    "id": "...",
    "email": "admin@HMall.com",
    "role": "admin",  // ← Phải là "admin"
    "balance": 100000.00
  },
  "token": "..."
}
```

### Cách 3: Test Admin API

Sau khi login, lấy token và test admin endpoint:

```bash
# Lưu token từ response login
TOKEN="your-admin-token-here"

# Test admin stats endpoint
curl -X GET http://localhost:3002/api/admin/users/stats \
  -H "Authorization: Bearer $TOKEN"
```

Nếu thành công, bạn sẽ nhận được thống kê. Nếu lỗi 403, có nghĩa là role chưa đúng.

---

## Troubleshooting

### Vấn đề: Đăng nhập thành công nhưng không thấy Admin Panel

**Nguyên nhân**: Role chưa được set thành `'admin'`

**Giải pháp**:
1. Kiểm tra trong database:
```sql
SELECT email, role FROM users WHERE email = 'admin@HMall.com';
```

2. Nếu role = `'user'`, update lại:
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@HMall.com';
```

3. Logout và login lại trong app

### Vấn đề: Script create-admin.js không chạy

**Nguyên nhân**: Thiếu dependencies

**Giải pháp**:
```bash
cd backend
npm install
```

### Vấn đề: Không thể chạy SQL trong Supabase Studio

**Giải pháp**:
1. Đảm bảo Supabase đang chạy:
```bash
cd supabase
supabase status
```

2. Nếu chưa chạy:
```bash
supabase start
```

3. Kiểm tra URL: http://localhost:54332

### Vấn đề: Quên mật khẩu admin

**Giải pháp**: Tạo lại password hash và update:

1. Chạy script để tạo password hash mới:
```bash
cd backend
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('newpassword', 10).then(hash => console.log(hash));"
```

2. Update trong database:
```sql
UPDATE users 
SET password_hash = '$2b$10$...'  -- Paste hash từ bước 1
WHERE email = 'admin@HMall.com';
```

---

## Cấu Trúc Admin Panel

Sau khi đăng nhập admin, bạn sẽ có quyền truy cập:

### 1. Admin Dashboard
- Thống kê tổng số users
- Tổng số transactions
- Tổng số products
- Tổng số tasks

### 2. Products Management
- Xem danh sách products
- Tạo product mới
- Sửa product
- Xóa product

### 3. Tasks Management
- Xem danh sách tasks
- Tạo task mới
- Sửa task
- Xóa task

### 4. Users Management
- Xem danh sách users
- Xem thông tin user
- Grant/Revoke coins cho user
- Xem transaction history của user

---

## Lưu Ý Bảo Mật

⚠️ **QUAN TRỌNG**:
- Đổi mật khẩu admin mặc định trong production
- Không commit password vào git
- Sử dụng environment variables cho sensitive data
- Giới hạn quyền admin chỉ cho người cần thiết

---

## Tóm Tắt Nhanh

```bash
# 1. Tạo admin user
cd backend
node scripts/create-admin.js
# Nhập email và password

# 2. Copy SQL và chạy trong Supabase Studio
# http://localhost:54332 → SQL Editor → Paste SQL → Run

# 3. Đăng nhập trong app
# Email: admin@HMall.com
# Password: (password bạn đã nhập)

# 4. Admin panel sẽ tự động hiển thị!
```

---

## Liên Kết Hữu Ích

- [QUICK_START.md](../QUICK_START.md) - Hướng dẫn setup nhanh
- [TESTING_GUIDE.md](../TESTING_GUIDE.md) - Hướng dẫn test admin features
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Hướng dẫn setup Supabase



