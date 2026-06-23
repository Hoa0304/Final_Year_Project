require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const dict = {
  'High quality product generated for testing': 'Sản phẩm chất lượng cao tự tạo để thử nghiệm',
  'Ergonomic mouse for productivity': 'Chuột công thái học giúp tăng năng suất làm việc',
  'Mechanical keyboard for typing': 'Bàn phím cơ gõ êm tay',
  'Educational book collection': 'Bộ sưu tập sách giáo dục',
  'Smart watch with fitness tracking': 'Đồng hồ thông minh theo dõi sức khỏe',
  'Online course for skill development': 'Khóa học trực tuyến phát triển kỹ năng',
  'Professional camera for photography': 'Máy ảnh chuyên nghiệp',
  'Premium headphones for immersive experience': 'Tai nghe cao cấp mang lại trải nghiệm tuyệt vời',
  'Portable tablet for work and entertainment': 'Máy tính bảng tiện lợi cho công việc và giải trí',
  'High-performance laptop for your digital workspace': 'Laptop hiệu năng cao cho không gian làm việc số',
  'Carbon fiber tennis racket': 'Vợt tennis sợi carbon',
  'Pair of 10kg dumbbells': 'Cặp tạ đơn 10kg',
  'Bestselling fiction story': 'Truyện tiểu thuyết bán chạy nhất',
  'Classic denim jeans': 'Quần jeans denim cổ điển',
  'Phở bò gia truyền': 'Phở bò gia truyền',
  'World history overview': 'Tổng quan lịch sử thế giới',
  'Personal development book': 'Sách phát triển bản thân',
  'Learn Python programming': 'Học lập trình Python',
  'Non-slip yoga mat': 'Thảm yoga chống trượt',
  'Latest smartphone with all features': 'Điện thoại thông minh mới nhất với đầy đủ tính năng',
  'Fitness and health tracking watch': 'Đồng hồ theo dõi sức khỏe và thể chất',
  'Bàn Làm Việc lamp for study': 'Đèn bàn làm việc/học tập',
  'Winter jacket for cold weather': 'Áo khoác mùa đông cho thời tiết lạnh',
  'Comfortable running sneakers': 'Giày chạy bộ thoải mái',
  'Cotton casual t-shirt': 'Áo thun cotton mặc thường ngày',
  'Pizza hải sản phô mai': 'Pizza hải sản phô mai',
  'Hamburger bò nướng': 'Hamburger bò nướng',
  'Cơm tấm Sài Gòn': 'Cơm tấm Sài Gòn',
  'Trà sữa trân châu đường đen': 'Trà sữa trân châu đường đen',
  'Nước cam vắt nguyên chất': 'Nước cam vắt nguyên chất',
  'Sinh tố dâu tây tươi mát': 'Sinh tố dâu tây tươi mát',
  'Trà đào thanh mát giải nhiệt': 'Trà đào thanh mát giải nhiệt',
  'Ceramic coffee mug': 'Cốc cà phê bằng sứ',
  'Decorative plant pot': 'Chậu cây trang trí',
  'Soft warm blanket': 'Chăn ấm mềm mại',
  'Professional basketball': 'Bóng rổ chuyên nghiệp',
  'High-performance laptop for work and gaming': 'Laptop hiệu năng cao cho công việc và giải trí',
  'Premium noise-canceling headphones': 'Tai nghe chống ồn cao cấp'
};

async function updateProducts() {
  console.log('Fetching products...');
  const { data: products, error } = await supabase.from('products').select('id, description');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  let updatedCount = 0;
  
  for (const product of products) {
    const vie = dict[product.description];
    if (vie && vie !== product.description) {
      await supabase.from('products').update({ description: vie }).eq('id', product.id);
      updatedCount++;
    }
  }
  
  console.log(`Updated ${updatedCount} products.`);
}

updateProducts();
