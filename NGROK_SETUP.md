# Hướng dẫn sử dụng ngrok cho HMall

Ngrok tạo một tunnel công khai đến backend local, giúp frontend (chạy trên điện thoại qua Expo tunnel) có thể kết nối được.

## Bước 1: Cài đặt ngrok

### Windows:

**Option A: Download trực tiếp**
1. Truy cập: https://ngrok.com/download
2. Download file `ngrok.exe` cho Windows
3. Giải nén vào thư mục (ví dụ: `C:\ngrok\`)
4. Thêm vào PATH hoặc dùng đường dẫn đầy đủ

**Option B: Dùng Chocolatey (nếu đã cài)**
```powershell
choco install ngrok
```

**Option C: Dùng Scoop (nếu đã cài)**
```powershell
scoop install ngrok
```

### Mac:
```bash
brew install ngrok/ngrok/ngrok
```

### Linux:
```bash
# Download và giải nén
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/
```

## Bước 2: Đăng ký tài khoản ngrok (miễn phí)

1. Truy cập: https://dashboard.ngrok.com/signup
2. Đăng ký tài khoản miễn phí
3. Lấy **authtoken** từ dashboard: https://dashboard.ngrok.com/get-started/your-authtoken

## Bước 3: Cấu hình ngrok

Chạy lệnh này một lần để cấu hình authtoken:

```powershell
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

Thay `YOUR_AUTHTOKEN_HERE` bằng authtoken bạn lấy từ dashboard.

## Bước 4: Khởi động ngrok

Mở một terminal mới và chạy:

```powershell
ngrok http 3002
```

Bạn sẽ thấy output như sau:

```
ngrok                                                                            

Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123-def456.ngrok-free.app -> http://localhost:3002

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Quan trọng:** Copy URL `https://abc123-def456.ngrok-free.app` (URL của bạn sẽ khác)

## Bước 5: Cập nhật frontend/.env

Mở file `frontend/.env` và cập nhật:

```env
EXPO_PUBLIC_API_URL=https://abc123-def456.ngrok-free.app
```

**Lưu ý:** 
- Dùng URL **https** (không phải http)
- URL này sẽ thay đổi mỗi lần restart ngrok (trừ khi dùng paid plan)

## Bước 6: Restart Expo

1. Dừng Expo (Ctrl+C)
2. Chạy lại:
   ```powershell
   cd frontend
   npm run dev
   ```

## Bước 7: Kiểm tra

Sau khi restart, trong Expo logs bạn sẽ thấy:

```
🔧 API Configuration:
   API_URL: https://abc123-def456.ngrok-free.app
   EXPO_PUBLIC_API_URL: https://abc123-def456.ngrok-free.app
```

Bây giờ thử đăng ký lại - nó sẽ hoạt động!

## Ngrok Web Interface

Ngrok cung cấp web interface để xem requests:

1. Mở browser: http://127.0.0.1:4040
2. Bạn sẽ thấy tất cả requests đến backend
3. Rất hữu ích để debug!

## Lưu ý quan trọng

### Free Plan:
- URL thay đổi mỗi lần restart ngrok
- Có giới hạn số lượng requests
- Có thể có warning page khi truy cập lần đầu

### Paid Plan:
- URL cố định (custom domain)
- Không giới hạn requests
- Không có warning page

## Troubleshooting

### Lỗi: "authtoken is required"
- Chạy lại: `ngrok config add-authtoken YOUR_AUTHTOKEN`

### Lỗi: "tunnel session failed"
- Kiểm tra backend đang chạy trên port 3002
- Kiểm tra firewall không chặn ngrok

### URL không hoạt động
- Đảm bảo ngrok đang chạy
- Copy lại URL mới từ ngrok terminal
- Cập nhật lại frontend/.env
- Restart Expo

### Warning page khi truy cập
- Đây là bình thường với free plan
- Click "Visit Site" để tiếp tục
- Hoặc upgrade lên paid plan để bỏ warning

## Script tự động (tùy chọn)

Bạn có thể tạo script để tự động lấy URL và cập nhật .env:

**PowerShell script (`start-ngrok.ps1`):**
```powershell
# Start ngrok
Start-Process ngrok -ArgumentList "http 3002" -NoNewWindow

# Wait a bit for ngrok to start
Start-Sleep -Seconds 3

# Get ngrok URL (requires jq or parsing ngrok API)
$ngrokUrl = (Invoke-RestMethod http://127.0.0.1:4040/api/tunnels).tunnels[0].public_url

Write-Host "Ngrok URL: $ngrokUrl"
Write-Host "Update frontend/.env with: EXPO_PUBLIC_API_URL=$ngrokUrl"
```

## Kết luận

Ngrok là giải pháp tốt nhất cho development với Expo tunnel vì:
- ✅ Hoạt động từ bất kỳ đâu
- ✅ Không cần cấu hình network phức tạp
- ✅ Dễ debug với web interface
- ✅ Miễn phí cho development



