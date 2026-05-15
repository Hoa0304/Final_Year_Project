# Quick Test Guide - HMall

Hướng dẫn test nhanh dự án HMall trong 10 phút.

## Bước 1: Chuẩn bị (2 phút)

### 1.1 Khởi động tất cả services

**Terminal 1 - Supabase:**

**PowerShell:**
```powershell
cd supabase
npx supabase start
```

**Bash:**
```bash
cd supabase && supabase start
```

**Terminal 2 - Backend:**
```bash
npm run dev:backend
```

**Terminal 3 - AI Service:**
```bash
npm run dev:ai
```

**Terminal 4 - Frontend:**
```bash
npm run dev:frontend
# Nhấn 't' để bật tunnel mode
```

### 1.2 Kiểm tra services đang chạy

- Backend: http://localhost:3002/health
- AI Service: http://localhost:3003/health
- Supabase Studio: http://localhost:54332

---

## Bước 2: Test API (3 phút)

### Option A: Chạy script tự động

**Windows (PowerShell):**
```powershell
.\scripts\test-api.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/test-api.sh
./scripts/test-api.sh
```

### Option B: Test thủ công

**1. Test Health Check:**
```bash
curl http://localhost:3002/health
```

**2. Register User:**
```bash
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","fullName":"Test User"}'
```

**3. Login:**
```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Lưu token từ response.

**4. Get Balance:**
```bash
curl http://localhost:3002/api/users/balance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**5. Get Products:**
```bash
curl http://localhost:3002/api/products
```

**6. Get Tasks:**
```bash
curl http://localhost:3002/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**7. Get Stocks:**
```bash
curl http://localhost:3002/api/stocks
```

---

## Bước 3: Test Frontend (5 phút)

### 3.1 Mở app trên điện thoại

1. Cài Expo Go app
2. Scan QR code từ terminal frontend
3. Đợi app load

### 3.2 Test Authentication

1. **Register:**
   - Nhập email: `testuser@example.com`
   - Nhập password: `password123`
   - Nhập full name: `Test User`
   - Nhấn Register
   - ✅ Kiểm tra: Chuyển sang Dashboard, số dư = 1000.00

2. **Logout và Login lại:**
   - Tap Profile → Logout
   - Login với email/password vừa tạo
   - ✅ Kiểm tra: Đăng nhập thành công

### 3.3 Test Dashboard

- ✅ Kiểm tra hiển thị:
  - Welcome message
  - Balance card (1000.00 coins)
  - Quick actions (4 buttons)
  - Recent transactions (có thể rỗng)

### 3.4 Test Marketplace

1. Tap "Marketplace"
2. ✅ Kiểm tra: Danh sách sản phẩm hiển thị
3. Tap vào một sản phẩm
4. ✅ Kiểm tra: Product detail hiển thị đầy đủ
5. Chọn quantity = 1
6. Tap "Purchase"
7. Confirm purchase
8. ✅ Kiểm tra:
   - Success message
   - Quay về Dashboard
   - Balance giảm đúng số tiền

### 3.5 Test Tasks

1. Tap "Tasks"
2. ✅ Kiểm tra: Danh sách tasks hiển thị
3. Tap "Complete" trên một task
4. Confirm
5. ✅ Kiểm tra:
   - Success message với reward
   - Balance tăng
   - Task status = "Completed"
   - Không thể complete lại

### 3.6 Test Stocks

1. Tap "Stocks"
2. ✅ Kiểm tra: Danh sách stocks hiển thị
3. Tap vào một stock
4. Chọn quantity = 5
5. Tap "Buy Stock"
6. Confirm
7. ✅ Kiểm tra:
   - Success message
   - Balance giảm
8. Tap "My Portfolio"
9. ✅ Kiểm tra:
   - Stock vừa mua hiển thị
   - Current value, profit/loss

### 3.7 Test Profile & Transactions

1. Tap "Profile"
2. ✅ Kiểm tra: Thông tin user hiển thị
3. Tap "Transaction History"
4. ✅ Kiểm tra: Danh sách transactions hiển thị
5. Kiểm tra có transactions từ:
   - Purchase product
   - Complete task
   - Buy stock

---

## Bước 4: Test Admin (Nếu có admin account)

### 4.1 Login as Admin

1. Logout
2. Login với:
   - Email: `admin@HMall.com`
   - Password: `admin123` (hoặc password bạn đã set)

### 4.2 Test Admin Dashboard

1. ✅ Kiểm tra: Admin tabs hiển thị
2. Tap "Admin Dashboard"
3. ✅ Kiểm tra: Stats hiển thị (total users, transactions, balance)

### 4.3 Test Admin Features

1. **Manage Products:**
   - Tap "Products"
   - ✅ Kiểm tra: Danh sách products (bao gồm inactive)
   - Có thể Create/Edit/Delete

2. **Manage Tasks:**
   - Tap "Tasks"
   - ✅ Kiểm tra: Danh sách tasks
   - Có thể Create/Edit/Delete

3. **Manage Users:**
   - Tap "Users"
   - ✅ Kiểm tra: Danh sách users
   - Có thể Grant/Revoke coins

---

## Checklist Test Nhanh

### API Tests
- [ ] Health check works
- [ ] Register user works
- [ ] Login works
- [ ] Get balance works
- [ ] Get products works
- [ ] Get tasks works
- [ ] Get stocks works

### Frontend Tests
- [ ] App loads successfully
- [ ] Register/Login works
- [ ] Dashboard displays correctly
- [ ] Marketplace works (browse, view, purchase)
- [ ] Tasks work (view, complete)
- [ ] Stocks work (view, buy, portfolio)
- [ ] Profile & transactions work

### Admin Tests (nếu có)
- [ ] Admin login works
- [ ] Admin dashboard displays
- [ ] Can manage products
- [ ] Can manage tasks
- [ ] Can manage users
- [ ] Can grant/revoke coins

---

## Troubleshooting

### API không response
- Kiểm tra backend đang chạy: `curl http://localhost:3002/health`
- Kiểm tra port 3002 không bị chiếm
- Kiểm tra `.env` file có đúng không

### Frontend không load
- Kiểm tra frontend đang chạy
- Kiểm tra tunnel mode đã bật (nhấn 't')
- Kiểm tra `EXPO_PUBLIC_API_URL` trong `.env`

### Không thể login
- Kiểm tra user đã được tạo chưa
- Kiểm tra password đúng không
- Kiểm tra backend logs

### Không có data
- Chạy migrations: `cd supabase && supabase db reset`
- Kiểm tra sample data đã được insert chưa

---

## Kết quả mong đợi

Sau khi test xong, bạn nên có:

✅ **API:**
- Tất cả endpoints hoạt động
- Authentication works
- CRUD operations work
- Error handling works

✅ **Frontend:**
- Tất cả screens hiển thị đúng
- Navigation works
- Forms validate input
- Data syncs correctly

✅ **Integration:**
- Frontend ↔ Backend communication works
- Backend ↔ Database works
- Backend ↔ AI Service works

---

## Test Chi Tiết

Nếu muốn test chi tiết hơn, xem [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## Thời gian ước tính

- **Quick Test:** 10 phút
- **Full Test:** 30-60 phút
- **Comprehensive Test:** 2-3 giờ


