import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const dictionary: Record<string, string> = {
  'Mouse': 'Chuột Máy Tính',
  'Keyboard': 'Bàn Phím',
  'Camera': 'Máy Ảnh',
  'Laptop': 'Máy Tính Xách Tay',
  'Smartphone': 'Điện Thoại Thông Minh',
  'Headphones': 'Tai Nghe',
  'Monitor': 'Màn Hình',
  'Tablet': 'Máy Tính Bảng',
  'Smartwatch': 'Đồng Hồ Thông Minh',
  'Speaker': 'Loa',
  'Desk': 'Bàn Làm Việc',
  'Chair': 'Ghế',
  'Lamp': 'Đèn',
  'Notebook': 'Sổ Tay',
  'Pen': 'Bút',
  'Backpack': 'Balo',
  'Shoes': 'Giày',
  'Shirt': 'Áo Sơ Mi',
  'Pants': 'Quần',
  'Jacket': 'Áo Khoác',
  'Watch': 'Đồng Hồ',
  'Glasses': 'Mắt Kính',
  'Hat': 'Mũ',
  'Socks': 'Tất',
  'Umbrella': 'Ô',
  'Wallet': 'Ví',
  'Belt': 'Thắt Lưng',
  'Ring': 'Nhẫn',
  'Necklace': 'Dây Chuyền',
  'Earrings': 'Bông Tai',
  'Bracelet': 'Vòng Tay',
  'Scarf': 'Khăn Quàng Cổ',
  'Gloves': 'Găng Tay',
  'Tie': 'Cà Vạt',
  'Suit': 'Vest',
  'Dress': 'Váy',
  'Skirt': 'Chân Váy',
  'Electronics': 'Điện tử',
  'Fashion': 'Thời trang',
  'Home': 'Nhà cửa',
  'Books': 'Sách',
  'Sports': 'Thể thao',
  'Beauty': 'Làm đẹp',
  'Health': 'Sức khỏe',
  'Toys': 'Đồ chơi',
  'Automotive': 'Ô tô - Xe máy',
  'Daily check-in': 'Điểm danh hàng ngày',
  'First purchase': 'Mua hàng lần đầu',
  'Review product': 'Đánh giá sản phẩm',
  'Share app': 'Chia sẻ ứng dụng',
  'Complete profile': 'Hoàn thiện hồ sơ',
};

async function translateData() {
  console.log('Starting data translation...');

  // 1. Translate Products
  const { data: products, error: pError } = await supabase.from('products').select('id, name, description, category');
  if (pError) console.error('Error fetching products:', pError);
  else if (products) {
    for (const p of products) {
      let changed = false;
      let newName = p.name;
      let newCat = p.category;
      let newDesc = p.description;

      for (const [eng, vie] of Object.entries(dictionary)) {
        if (newName && newName.includes(eng)) {
          newName = newName.replace(new RegExp(eng, 'g'), vie);
          changed = true;
        }
        if (newCat && newCat === eng) {
          newCat = vie;
          changed = true;
        }
        if (newDesc && newDesc.includes(eng)) {
          newDesc = newDesc.replace(new RegExp(eng, 'g'), vie);
          changed = true;
        }
      }

      if (changed) {
        await supabase.from('products').update({ name: newName, category: newCat, description: newDesc }).eq('id', p.id);
        console.log(`Translated Product: ${p.name} -> ${newName}`);
      }
    }
  }

  // 2. Translate Tasks
  const { data: tasks, error: tError } = await supabase.from('tasks').select('id, title, description');
  if (tError) console.error('Error fetching tasks:', tError);
  else if (tasks) {
    for (const t of tasks) {
      let changed = false;
      let newTitle = t.title;
      let newDesc = t.description;

      for (const [eng, vie] of Object.entries(dictionary)) {
        if (newTitle && newTitle.includes(eng)) {
          newTitle = newTitle.replace(new RegExp(eng, 'g'), vie);
          changed = true;
        }
        if (newDesc && newDesc.includes(eng)) {
          newDesc = newDesc.replace(new RegExp(eng, 'g'), vie);
          changed = true;
        }
      }

      if (changed) {
        await supabase.from('tasks').update({ title: newTitle, description: newDesc }).eq('id', t.id);
        console.log(`Translated Task: ${t.title} -> ${newTitle}`);
      }
    }
  }

  // 3. Translate Discussion Threads
  const { data: threads, error: thError } = await supabase.from('discussion_threads').select('id, title, content');
  if (thError) console.error('Error fetching threads:', thError);
  else if (threads) {
    for (const t of threads) {
      let changed = false;
      let newTitle = t.title;
      let newContent = t.content;

      if (newTitle === 'Welcome to HMall!') { newTitle = 'Chào mừng đến với HMall!'; changed = true; }
      if (newContent && newContent.includes('Feel free to ask questions')) { newContent = 'Hãy đặt câu hỏi, chia sẻ mẹo và kết nối với người mua và người bán khác.'; changed = true; }

      if (changed) {
        await supabase.from('discussion_threads').update({ title: newTitle, content: newContent }).eq('id', t.id);
        console.log(`Translated Thread: ${t.title} -> ${newTitle}`);
      }
    }
  }

  console.log('Data translation completed.');
}

translateData();
