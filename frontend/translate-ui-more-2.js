const fs = require('fs');
const path = require('path');

const dict = {
  '>Loading list...<': '>Đang tải danh sách...<',
  'placeholder="Product description"': 'placeholder="Mô tả sản phẩm"',
  '>Description<': '>Mô tả<',
  'placeholder="laptop, iPhone, etc."': 'placeholder="laptop, iPhone, v.v..."',
  'placeholder="e.g., 100 or -50"': 'placeholder="VD: 100 hoặc -50"',
  'placeholder="e.g. tracking-12345"': 'placeholder="VD: tracking-12345"',
  'placeholder="Add note..."': 'placeholder="Thêm ghi chú..."',
  'placeholder="Share your experience about this product..."': 'placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."',
  '>Loading products...<': '>Đang tải sản phẩm...<',
  '>No limit<': '>Không giới hạn<',
  'placeholder="Introduce yourself..."': 'placeholder="Giới thiệu bản thân..."',
  "placeholder=\"What's on your mind?\"": 'placeholder="Bạn đang nghĩ gì?"',
  'placeholder="What\'s on your mind?"': 'placeholder="Bạn đang nghĩ gì?"',
  'placeholder="Additional details..."': 'placeholder="Chi tiết thêm..."',
  'placeholder="Product name"': 'placeholder="Tên sản phẩm"',
  'placeholder="URL or upload"': 'placeholder="URL hoặc tải lên"',
  'placeholder="e.g. 15"': 'placeholder="VD: 15"',
  '>Quick Actions<': '>Thao tác nhanh<',
  'placeholder="e.g., Save for new phone"': 'placeholder="VD: Tiết kiệm mua điện thoại mới"',
  '>Email<': '>Email<',
  'placeholder="Enter email..."': 'placeholder="Nhập email..."',
  'placeholder="Enter password..."': 'placeholder="Nhập mật khẩu..."',
  'placeholder="Search products..."': 'placeholder="Tìm kiếm sản phẩm..."',
  'placeholder="Search users..."': 'placeholder="Tìm kiếm người dùng..."',
  'placeholder="Search vendors..."': 'placeholder="Tìm kiếm người bán..."',
  'placeholder="Search transactions..."': 'placeholder="Tìm kiếm giao dịch..."',
  '>User<': '>Người dùng<',
  '>Vendor<': '>Người bán<',
  '>Admin<': '>Quản trị viên<',
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
      
      // Also catch "What's on your mind?" with single quotes
      if (content.includes("What's on your mind?")) {
        content = content.replace(/>What's on your mind\?</g, '>Bạn đang nghĩ gì?<');
        content = content.replace(/placeholder="What's on your mind\?"/g, 'placeholder="Bạn đang nghĩ gì?"');
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
console.log('Done');
