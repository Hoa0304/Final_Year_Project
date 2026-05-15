# Cloudinary Setup Guide

Hướng dẫn cấu hình Cloudinary để upload và lưu trữ ảnh trong ứng dụng HMall.

## Bước 1: Tạo tài khoản Cloudinary

1. Truy cập: https://cloudinary.com/users/register/free
2. Đăng ký tài khoản miễn phí (25GB storage, 25GB bandwidth/month)
3. Xác nhận email

## Bước 2: Lấy Cloudinary Credentials

1. Đăng nhập vào Cloudinary Dashboard: https://console.cloudinary.com/
2. Vào **Settings** → **Access Keys**
3. Copy các thông tin sau:
   - **Cloud Name** (ví dụ: `dabc123`)
   - **API Key** (ví dụ: `123456789012345`)
   - **API Secret** (ví dụ: `abcdefghijklmnopqrstuvwxyz123456`)

## Bước 3: Cấu hình Backend

Thêm vào file `backend/.env`:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Lưu ý:** 
- Không commit file `.env` vào git
- Thay thế `your_cloud_name`, `your_api_key`, `your_api_secret` bằng giá trị thực từ Cloudinary Dashboard

## Bước 4: Kiểm tra Cài đặt

### Backend Dependencies
```bash
cd backend
npm install cloudinary multer
```

### Frontend Dependencies
Frontend đã có `expo-image-picker` (đã cài sẵn trong package.json)

## Bước 5: Test Upload

### Test qua API

```bash
# Upload file
curl -X POST http://localhost:3002/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "folder=products"
```

### Test qua Frontend

1. Mở app
2. Vào **Vendor Products** hoặc **Admin Products**
3. Click icon upload (cloud icon) bên cạnh Image URL input
4. Chọn "Choose from Gallery" hoặc "Take Photo"
5. Chọn/take ảnh
6. Ảnh sẽ tự động upload và URL sẽ được điền vào input

## Cấu trúc Thư mục trong Cloudinary

Files được tổ chức theo cấu trúc:
```
HMall/
  ├── products/     (ảnh sản phẩm)
  ├── games/        (ảnh game cards)
  └── general/      (ảnh khác)
```

Mỗi file có format: `{folder}/{userId}_{timestamp}`

## API Endpoints

### Upload File
- **POST** `/api/upload`
- **Auth:** Required
- **Body:** `multipart/form-data`
  - `file`: Image file
  - `folder`: Folder name (optional, default: 'general')
- **Response:**
```json
{
  "message": "File uploaded successfully",
  "url": "https://res.cloudinary.com/...",
  "publicId": "HMall/products/user123_1234567890"
}
```

### Delete File by Public ID
- **DELETE** `/api/upload/:publicId`
- **Auth:** Required

### Delete File by URL
- **DELETE** `/api/upload/by-url`
- **Auth:** Required
- **Body:**
```json
{
  "url": "https://res.cloudinary.com/..."
}
```

## File Validation

- **Allowed Types:** JPEG, JPG, PNG, GIF, WebP, SVG
- **Max Size:** 10MB
- **Auto-detection:** Cloudinary tự động detect image/video/raw

## Troubleshooting

### Error: "Cloudinary configuration missing"
- Kiểm tra `backend/.env` có đầy đủ 3 biến: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Restart backend server

### Error: "Upload failed"
- Kiểm tra internet connection
- Kiểm tra file size < 10MB
- Kiểm tra file type là image
- Xem backend logs để biết chi tiết lỗi

### Error: "Invalid file type"
- Chỉ chấp nhận: JPEG, PNG, GIF, WebP, SVG
- Đổi format ảnh nếu cần

### Image không hiển thị sau upload
- Kiểm tra URL trong database
- Kiểm tra Cloudinary URL có accessible không
- Kiểm tra CORS settings trong Cloudinary (nếu cần)

## Security Notes

- API Secret không được expose ra frontend
- Tất cả upload phải qua backend (không upload trực tiếp từ frontend)
- Files được organize theo user ID để dễ quản lý
- Có thể setup Cloudinary security settings để restrict access

## Free Plan Limits

- **Storage:** 25GB
- **Bandwidth:** 25GB/month
- **Transformations:** Unlimited
- **Concurrent uploads:** 10

Nếu vượt quá, cần upgrade plan hoặc optimize images trước khi upload.























