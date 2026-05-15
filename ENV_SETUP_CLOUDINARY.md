# Cloudinary Environment Variables Setup

## Backend Configuration

Thêm vào file `backend/.env`:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

## Lấy Credentials từ Cloudinary

1. Đăng nhập: https://console.cloudinary.com/
2. Vào **Settings** → **Access Keys**
3. Copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

## Kiểm tra Configuration

Sau khi thêm vào `.env`, restart backend server:

```bash
cd backend
npm run dev
```

Kiểm tra logs - không nên có error về Cloudinary configuration.






















