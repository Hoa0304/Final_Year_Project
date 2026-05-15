# Hướng Dẫn Xem và Xuất Biểu Đồ

## Cách Xem Biểu Đồ

### 1. Xem File HTML (Khuyến nghị - Dễ nhất)

1. Mở file `docs/SYSTEM_DESIGN.html` trong trình duyệt (Chrome, Edge, Firefox)
2. Tất cả biểu đồ sẽ tự động hiển thị dưới dạng hình ảnh
3. Bạn có thể:
   - Xem toàn bộ tài liệu với biểu đồ
   - In ra PDF (Ctrl+P → Save as PDF)
   - Chụp màn hình các biểu đồ

### 2. Xem trên GitHub/GitLab

1. Đẩy code lên GitHub hoặc GitLab
2. Mở file `docs/SYSTEM_DESIGN.md` trên web
3. GitHub/GitLab sẽ tự động render các biểu đồ Mermaid

### 3. Xem trong VS Code

1. Cài đặt extension "Markdown Preview Mermaid Support"
2. Mở file `docs/SYSTEM_DESIGN.md`
3. Nhấn `Ctrl+Shift+V` (hoặc `Cmd+Shift+V` trên Mac) để xem preview
4. Biểu đồ sẽ hiển thị tự động

### 4. Xem Online (Mermaid Live Editor)

1. Truy cập: https://mermaid.live/
2. Copy code từ file `docs/SYSTEM_DESIGN.md` (phần giữa ```mermaid và ```)
3. Paste vào editor
4. Xem và export dưới dạng PNG/SVG

## Cách Xuất Biểu Đồ Thành File Ảnh

### Windows (PowerShell)

```powershell
# Chạy script tự động
.\scripts\export-diagrams.ps1
```

Script sẽ:
- Tự động cài đặt Mermaid CLI nếu chưa có
- Trích xuất tất cả biểu đồ từ `SYSTEM_DESIGN.md`
- Xuất ra file PNG và SVG trong thư mục `docs/diagrams/`

### Linux/Mac (Bash)

```bash
# Cấp quyền thực thi
chmod +x scripts/export-diagrams.sh

# Chạy script
./scripts/export-diagrams.sh
```

### Xuất Thủ Công

1. Cài đặt Mermaid CLI:
   ```bash
   npm install -g @mermaid-js/mermaid-cli
   ```

2. Tạo file `.mmd` với nội dung biểu đồ (copy từ SYSTEM_DESIGN.md)

3. Xuất ra PNG:
   ```bash
   mmdc -i diagram.mmd -o diagram.png -w 1920 -H 1080
   ```

4. Xuất ra SVG:
   ```bash
   mmdc -i diagram.mmd -o diagram.svg
   ```

## Danh Sách Biểu Đồ

File `docs/SYSTEM_DESIGN.md` chứa các biểu đồ sau:

1. **Use Case Diagram - User** (Biểu đồ Use Case - Người dùng)
2. **Use Case Diagram - Admin** (Biểu đồ Use Case - Quản trị viên)
3. **Use Case Diagram - Complete System** (Biểu đồ Use Case - Hệ thống đầy đủ)
4. **Activity Diagram - Purchase Product** (Biểu đồ Hoạt động - Mua sản phẩm)
5. **Activity Diagram - Complete Task** (Biểu đồ Hoạt động - Hoàn thành nhiệm vụ)
6. **Activity Diagram - Stock Trading** (Biểu đồ Hoạt động - Giao dịch cổ phiếu)
7. **Activity Diagram - Generate AI Recommendations** (Biểu đồ Hoạt động - Tạo gợi ý AI)
8. **Sequence Diagram - User Registration and Login** (Biểu đồ Tuần tự - Đăng ký và đăng nhập)
9. **Sequence Diagram - Purchase Product** (Biểu đồ Tuần tự - Mua sản phẩm)
10. **Sequence Diagram - Complete Task** (Biểu đồ Tuần tự - Hoàn thành nhiệm vụ)
11. **Sequence Diagram - Buy Stocks** (Biểu đồ Tuần tự - Mua cổ phiếu)
12. **Sequence Diagram - Get AI Recommendations** (Biểu đồ Tuần tự - Lấy gợi ý AI)
13. **Sequence Diagram - Admin Grant Coins** (Biểu đồ Tuần tự - Admin cấp coin)
14. **Component Diagram** (Biểu đồ Component)
15. **Deployment Diagram** (Biểu đồ Triển khai)
16. **Entity Relationship Diagram** (Biểu đồ ERD - Cơ sở dữ liệu)

## Lưu Ý

- File HTML (`SYSTEM_DESIGN.html`) là cách dễ nhất để xem tất cả biểu đồ
- Để xuất PDF, mở file HTML và dùng chức năng Print → Save as PDF
- Các file ảnh xuất ra sẽ có chất lượng cao, phù hợp cho báo cáo và tài liệu


