# Quick Environment Setup Guide

Hướng dẫn nhanh để setup environment variables cho HMall.

## Bước 1: Tạo file .env

Các file `.env` đã được tạo tự động. Nếu chưa có, chạy:

```powershell
# Từ root directory
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
Copy-Item ai-service\.env.example ai-service\.env
```

## Bước 2: Lấy Supabase Credentials

1. **Khởi động Supabase:**
   ```powershell
   cd supabase
   npx supabase start
   ```

2. **Copy các keys từ output:**
   - Tìm dòng `anon key: eyJhbGc...`
   - Tìm dòng `service_role key: eyJhbGc...`
   - Copy toàn bộ key (rất dài)

3. **Lưu lại các keys này** - bạn sẽ cần chúng ở bước tiếp theo

## Bước 3: Cập nhật backend/.env

Mở file `backend/.env` và thay thế:

```env
SUPABASE_URL=http://localhost:54330
SUPABASE_ANON_KEY=paste-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=paste-service-role-key-here
JWT_SECRET=your-random-secret-key-here
```

**Lưu ý:**
- `SUPABASE_URL` đã đúng (http://localhost:54330)
- Thay `paste-anon-key-here` bằng anon key từ Supabase
- Thay `paste-service-role-key-here` bằng service_role key từ Supabase
- Thay `your-random-secret-key-here` bằng một chuỗi ngẫu nhiên (ví dụ: `my-super-secret-jwt-key-12345`)

## Bước 4: Cập nhật frontend/.env

Mở file `frontend/.env` và thay thế:

```env
EXPO_PUBLIC_API_URL=http://localhost:3002
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54330
EXPO_PUBLIC_SUPABASE_ANON_KEY=paste-anon-key-here
EXPO_PUBLIC_AI_SERVICE_URL=http://localhost:3003
```

**Lưu ý:**
- Thay `paste-anon-key-here` bằng anon key từ Supabase (cùng key với backend)
- Các URL đã đúng

## Bước 5: Kiểm tra

Sau khi cập nhật, kiểm tra:

```powershell
# Backend
cd backend
npm run dev
# Nếu không có lỗi về SUPABASE_URL, đã OK

# AI Service
cd ai-service
npm run dev
# Nếu không có lỗi, đã OK
```

## Quick Copy Template

Sau khi chạy `npx supabase start`, bạn sẽ thấy output như:

```
API URL: http://localhost:54330
...
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

Copy các keys này vào file `.env` tương ứng.

## Troubleshooting

### Lỗi "supabaseUrl is required"
- Kiểm tra `backend/.env` có tồn tại không
- Kiểm tra `SUPABASE_URL` có giá trị không rỗng
- Đảm bảo không có khoảng trắng thừa

### Lỗi "Invalid API key"
- Kiểm tra key đã copy đầy đủ chưa (key rất dài)
- Đảm bảo không có khoảng trắng hoặc ký tự lạ
- Thử copy lại từ Supabase output

### Frontend không kết nối được
- Kiểm tra `EXPO_PUBLIC_` prefix (bắt buộc cho Expo)
- Restart Expo server sau khi thay đổi .env
- Xóa cache: `npx expo start -c`

## File Locations

- `backend/.env` - Backend environment variables
- `frontend/.env` - Frontend environment variables  
- `ai-service/.env` - AI service environment variables
- `backend/.env.example` - Template cho backend
- `frontend/.env.example` - Template cho frontend
- `ai-service/.env.example` - Template cho AI service

## Security

⚠️ **QUAN TRỌNG:**
- File `.env` đã được thêm vào `.gitignore`
- **KHÔNG BAO GIỜ** commit file `.env` lên Git
- Chỉ share `.env.example` (không có credentials thật)



