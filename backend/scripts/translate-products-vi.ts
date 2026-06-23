import { supabase } from '../src/utils/supabase';

async function translateProducts() {
  const dictionary: Record<string, string> = {
    'Mouse': 'Chuột Máy Tính',
    'Camera': 'Máy Ảnh',
    'Keyboard': 'Bàn Phím',
    'Headphones': 'Tai Nghe',
    'Book': 'Sách',
    'Watch': 'Đồng Hồ',
    'Course': 'Khóa Học',
    'Tablet': 'Máy Tính Bảng',
    'Laptop': 'Máy Tính Xách Tay',
    'Smartphone': 'Điện Thoại Thông Minh'
  };

  const { data: products } = await supabase.from('products').select('id, name');
  
  if (!products) {
    console.error('Failed to fetch products');
    process.exit(1);
  }

  let count = 0;
  for (const product of products) {
    if (dictionary[product.name]) {
      const newName = dictionary[product.name];
      const { error } = await supabase
        .from('products')
        .update({ name: newName })
        .eq('id', product.id);

      if (error) {
        console.error(`Error translating ${product.name}:`, error.message);
      } else {
        console.log(`Translated: ${product.name} -> ${newName}`);
        count++;
      }
    }
  }

  console.log(`Successfully translated ${count} products to Vietnamese.`);
  process.exit(0);
}

translateProducts();
