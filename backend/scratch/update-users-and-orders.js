require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const REAL_NAMES = [
  'David John', 'Cẩm Hoa', 'Trần Thị Thương', 'Michael Smith', 'Lê Văn Tèo', 
  'Nguyễn Hữu Tài', 'Phạm Minh Tuấn', 'Emma Watson', 'Sarah Connor', 'Hoàng Ngọc Bích',
  'Đỗ Quyên', 'Bùi Xuân Huấn', 'Trương Vô Kỵ', 'Triệu Mẫn', 'Chu Chỉ Nhược',
  'Tony Stark', 'Steve Rogers', 'Natasha Romanoff', 'Bruce Banner', 'Peter Parker',
  'Ngô Khởi My', 'Trần Lập', 'Phan Đinh Tùng', 'Võ Hạ Trâm', 'Đan Trường',
  'Hồ Ngọc Hà', 'Lý Hải', 'Khởi My', 'Nguyễn Thúc Thùy Tiên', 'Mai Phương Thúy',
  'John Doe', 'Jane Doe', 'Alice Wonderland', 'Bob Builder', 'Charlie Chaplin',
  'Phạm Băng Băng', 'Châu Kiệt Luân', 'Lưu Diệc Phi', 'Dương Mịch', 'Triệu Lệ Dĩnh',
  'Chris Hemsworth', 'Chris Evans', 'Robert Downey Jr', 'Scarlett Johansson', 'Tom Holland',
  'Nguyễn Quang Hải', 'Đoàn Văn Hậu', 'Lương Xuân Trường', 'Nguyễn Công Phượng', 'Đặng Văn Lâm',
  'Sơn Tùng M-TP', 'Đen Vâu', 'Jack', 'Binz', 'Karik',
  'Trấn Thành', 'Trường Giang', 'Việt Hương', 'Hoài Linh', 'Chí Tài',
  'Nguyễn Vĩ', 'Trần Khang', 'Lê Kha', 'Bùi Bích', 'Phạm Phú',
  'Hoàng Hậu', 'Đỗ Đạt', 'Vũ Văn', 'Trương Trọng', 'Hồ Chí',
  'Nguyễn Minh Tuấn', 'Trần Bảo Ngọc', 'Lê Hoàng Cường', 'Phạm Thu Trang', 'Hoàng Vĩnh Khang',
  'Đỗ Mỹ Linh', 'Vũ Đình Cương', 'Bùi Lan Hương', 'Khương Ngọc', 'Lương Bích Hữu',
  'William Shakespeare', 'Albert Einstein', 'Isaac Newton', 'Galileo Galilei', 'Marie Curie',
  'Leonardo DiCaprio', 'Brad Pitt', 'Johnny Depp', 'Tom Cruise', 'Keanu Reeves',
  'Ngô Tất Tố', 'Vũ Trọng Phụng', 'Nam Cao', 'Kim Lân', 'Tô Hoài'
];

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function main() {
  try {
    console.log('1. Fetching all users named Customer %...');
    const { data: usersToUpdate, error: fetchError } = await supabase
      .from('users')
      .select('id, full_name')
      .like('full_name', 'Customer %');

    if (fetchError) throw fetchError;
    
    if (usersToUpdate && usersToUpdate.length > 0) {
      console.log(`Found ${usersToUpdate.length} users. Updating names...`);
      
      const availableNames = [...REAL_NAMES];
      
      for (const u of usersToUpdate) {
        let newName = '';
        if (availableNames.length > 0) {
          const idx = Math.floor(Math.random() * availableNames.length);
          newName = availableNames[idx];
          // don't remove if we want duplicates, or we can just pick random.
          // let's just pick random.
        }
        newName = randomItem(REAL_NAMES) + ' ' + Math.floor(Math.random() * 100); // add random number to guarantee somewhat unique names if list is exhausted, or just use list
        newName = randomItem(REAL_NAMES);
        
        await supabase.from('users').update({ full_name: newName }).eq('id', u.id);
      }
      console.log('✅ Users updated successfully.');
    } else {
      console.log('No Customer % users found.');
    }

    console.log('2. Fetching all seeded orders assigned to testuser...');
    const TEST_USER_ID = '8f4c4c7a-4228-4be7-b936-5a407a7b820c';
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id')
      .eq('user_id', TEST_USER_ID);

    if (orderError) throw orderError;
    
    if (orders && orders.length > 0) {
      // Get all standard users to pick from
      const { data: allUsers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'user');
        
      if (allUsers && allUsers.length > 0) {
        console.log(`Reassigning ${orders.length} orders among ${allUsers.length} users...`);
        let updatedCount = 0;
        for (const order of orders) {
          // Keep about 10% of orders for testuser, reassign 90%
          if (Math.random() < 0.9) {
            const randomUserId = randomItem(allUsers).id;
            await supabase.from('orders').update({ user_id: randomUserId }).eq('id', order.id);
            updatedCount++;
          }
        }
        console.log(`✅ Successfully reassigned ${updatedCount} orders to random users.`);
      }
    }

  } catch (e) {
    console.error('Error:', e);
  }
}

main();
