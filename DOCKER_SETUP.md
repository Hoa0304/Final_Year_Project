# Docker Setup Guide for HMall

Supabase local development yêu cầu Docker Desktop.

## Vấn đề: Docker Desktop chưa chạy

Lỗi bạn gặp:
```
error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.51/containers/...": 
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

Điều này có nghĩa là Docker Desktop chưa được khởi động.

## Giải pháp

### Bước 1: Kiểm tra Docker Desktop đã cài đặt chưa

```powershell
docker --version
```

Nếu chưa cài, tải và cài đặt từ: https://www.docker.com/products/docker-desktop/

### Bước 2: Khởi động Docker Desktop

1. **Tìm Docker Desktop trong Start Menu:**
   - Gõ "Docker Desktop" trong Windows Search
   - Click vào Docker Desktop

2. **Hoặc chạy từ PowerShell (nếu đã cài):**
   ```powershell
   Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
   ```

3. **Đợi Docker Desktop khởi động:**
   - Icon Docker sẽ xuất hiện ở system tray (góc dưới bên phải)
   - Đợi đến khi icon không còn "animating" (thường 1-2 phút)

### Bước 3: Kiểm tra Docker đang chạy

```powershell
docker ps
```

Nếu không có lỗi, Docker đã sẵn sàng.

### Bước 4: Chạy Supabase

```powershell
cd supabase
npx supabase start
```

## Troubleshooting

### Docker Desktop không khởi động được

1. **Kiểm tra WSL 2:**
   - Docker Desktop yêu cầu WSL 2 trên Windows
   - Kiểm tra: `wsl --status`
   - Nếu chưa có, cài WSL 2:
     ```powershell
     wsl --install
     ```

2. **Kiểm tra Hyper-V:**
   - Docker Desktop cần Hyper-V hoặc WSL 2
   - Kiểm tra trong Windows Features

3. **Restart Docker Desktop:**
   - Right-click icon Docker ở system tray
   - Chọn "Restart Docker Desktop"

4. **Kiểm tra resources:**
   - Docker Desktop cần ít nhất 4GB RAM
   - Kiểm tra trong Docker Desktop Settings > Resources

### Docker Desktop chạy nhưng vẫn lỗi

1. **Kiểm tra Docker daemon:**
   ```powershell
   docker info
   ```

2. **Restart Docker service:**
   ```powershell
   # Stop Docker
   Stop-Service docker
   
   # Start Docker
   Start-Service docker
   ```

3. **Kiểm tra firewall/antivirus:**
   - Tạm thời tắt firewall/antivirus
   - Hoặc thêm exception cho Docker

### Lỗi "WSL 2 installation is incomplete"

1. **Cài WSL 2:**
   ```powershell
   wsl --install
   ```

2. **Set WSL 2 as default:**
   ```powershell
   wsl --set-default-version 2
   ```

3. **Restart computer**

### Lỗi "Docker Desktop requires Windows 10/11 Pro"

- Docker Desktop yêu cầu Windows 10/11 Pro, Enterprise, hoặc Education
- Windows Home có thể dùng Docker Toolbox (không khuyến nghị)
- Hoặc upgrade lên Windows Pro

## Kiểm tra Docker đang chạy

```powershell
# Kiểm tra Docker version
docker --version

# Kiểm tra Docker daemon
docker info

# Kiểm tra containers đang chạy
docker ps

# Kiểm tra tất cả containers (bao gồm stopped)
docker ps -a
```

## Sau khi Docker chạy

1. **Chạy Supabase:**
   ```powershell
   cd supabase
   npx supabase start
   ```

2. **Kiểm tra Supabase containers:**
   ```powershell
   docker ps
   ```
   
   Bạn sẽ thấy các containers:
   - `supabase_db_HMall`
   - `supabase_studio_HMall`
   - `supabase_kong_HMall`
   - Và các containers khác

3. **Truy cập Supabase Studio:**
   - Mở browser: http://localhost:54332
   - Kiểm tra có thể truy cập được

## Tips

1. **Luôn khởi động Docker Desktop trước khi chạy Supabase**

2. **Kiểm tra Docker Desktop đang chạy:**
   - Icon Docker ở system tray phải là màu xanh (không phải đỏ/vàng)

3. **Nếu Docker Desktop chậm:**
   - Tăng RAM allocation trong Settings > Resources
   - Giảm số containers đang chạy

4. **Dừng Supabase khi không dùng:**
   ```powershell
   cd supabase
   npx supabase stop
   ```
   
   Điều này sẽ dừng containers nhưng không xóa data.

## Tài liệu tham khảo

- [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- [WSL 2 Installation](https://docs.microsoft.com/windows/wsl/install)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)



