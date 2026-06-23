const fs = require('fs');
const path = require('path');

const dict = {
  '>Search<': '>Tìm kiếm<',
  '>Search...<': '>Tìm kiếm...<',
  '>Save<': '>Lưu<',
  '>Cancel<': '>Hủy<',
  '>Edit<': '>Sửa<',
  '>Delete<': '>Xóa<',
  '>Create<': '>Tạo<',
  '>Add<': '>Thêm<',
  '>Update<': '>Cập nhật<',
  '>Submit<': '>Gửi<',
  '>Confirm<': '>Xác nhận<',
  '>Status<': '>Trạng thái<',
  '>Price<': '>Giá<',
  '>Name<': '>Tên<',
  '>Description<': '>Mô tả<',
  '>Title<': '>Tiêu đề<',
  '>Reward<': '>Phần thưởng<',
  '>Available<': '>Có sẵn<',
  '>Required<': '>Bắt buộc<',
  '>Optional<': '>Tùy chọn<',
  '>Balance<': '>Số dư<',
  '>Total<': '>Tổng<',
  '>Amount<': '>Số tiền<',
  '>Success<': '>Thành công<',
  '>Error<': '>Lỗi<',
  '>Loading...<': '>Đang tải...<',
  '>Close<': '>Đóng<',
  '>Back<': '>Quay lại<',
  '>Next<': '>Tiếp theo<',
  '>Previous<': '>Trước<',
  '>Yes<': '>Có<',
  '>No<': '>Không<',
  '>Home<': '>Trang chủ<',
  '>Settings<': '>Cài đặt<',
  '>Profile<': '>Hồ sơ<',
  '>Logout<': '>Đăng xuất<',
  '>Login<': '>Đăng nhập<',
  '>Register<': '>Đăng ký<',
  '>Email<': '>Email<',
  '>Password<': '>Mật khẩu<',
  '>Transactions<': '>Giao dịch<',
  '>Orders<': '>Đơn hàng<',
  '>Products<': '>Sản phẩm<',
  '>Categories<': '>Danh mục<',
  '>Category<': '>Danh mục<',
  '>Quantity<': '>Số lượng<',
  '>Stock<': '>Kho<',
  '>Dashboard<': '>Tổng quan<',
  '>Tasks<': '>Nhiệm vụ<',
  '>No transactions yet<': '>Chưa có giao dịch nào<',
  '>No products found<': '>Không tìm thấy sản phẩm<',
  '>No orders found<': '>Không tìm thấy đơn hàng<',
  '>No messages yet<': '>Chưa có tin nhắn<',
  '>No notifications yet<': '>Chưa có thông báo<',
  '>View All<': '>Xem tất cả<',
  '>See All<': '>Xem tất cả<',
  '>Show More<': '>Hiển thị thêm<',
  '>Show Less<': '>Ẩn bớt<',
  '>Apply<': '>Áp dụng<',
  '>Clear<': '>Xóa<',
  '>Filter<': '>Lọc<',
  '>Sort<': '>Sắp xếp<',
  '>completed<': '>đã hoàn thành<',
  '>pending<': '>đang chờ<',
  '>processing<': '>đang xử lý<',
  '>shipped<': '>đã gửi hàng<',
  '>delivered<': '>đã giao<',
  '>cancelled<': '>đã hủy<',
  '>Active<': '>Hoạt động<',
  '>Inactive<': '>Không hoạt động<',
  '>Approved<': '>Đã duyệt<',
  '>Rejected<': '>Đã từ chối<',
  '>Pending<': '>Đang chờ<',
  '>Purchases<': '>Lượt mua<',
  '>Target<': '>Mục tiêu<',
  '>Last<': '>Gần nhất<',
  '>days<': '>ngày<',
  '>Type a message...<': '>Nhập tin nhắn...<',
};

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [eng, vie] of Object.entries(dict)) {
        if (content.includes(eng)) {
          content = content.split(eng).join(vie);
          changed = true;
        }
      }
      // Special regex replacements for text inside elements
      const newContent = content
        .replace(/>\s*Search\s*</g, '>Tìm kiếm<')
        .replace(/>\s*Cancel\s*</g, '>Hủy<')
        .replace(/>\s*Save\s*</g, '>Lưu<')
        .replace(/>\s*Delete\s*</g, '>Xóa<')
        .replace(/>\s*Edit\s*</g, '>Sửa<')
        .replace(/>\s*Completed\s*</g, '>Hoàn thành<')
        .replace(/>\s*Pending\s*</g, '>Đang chờ<')
        .replace(/>\s*Active\s*</g, '>Hoạt động<')
        .replace(/placeholder="Search/g, 'placeholder="Tìm kiếm')
        .replace(/placeholder="Type a message/g, 'placeholder="Nhập tin nhắn')
        .replace(/>(\d+) completed</g, '>$1 đã hoàn thành<')
        .replace(/>Reward: (.*)</g, '>Phần thưởng: $1<')
        .replace(/Alert\.alert\('Error',/g, "Alert.alert('Lỗi',")
        .replace(/Alert\.alert\('Success',/g, "Alert.alert('Thành công',")
        .replace(/Alert\.alert\('Info',/g, "Alert.alert('Thông tin',")
        .replace(/>Total: (.*)</g, '>Tổng cộng: $1<');
        
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

walk('src/screens');
walk('src/components');
console.log('Translation complete');
