require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const nameToImageMap = {
  // Drinkshop
  'Trà Sữa Trân Châu': 'https://images.unsplash.com/photo-1558857563-b37103fb8d49?w=600&q=80', // boba
  'Nước Ép Dưa Hấu': 'https://images.unsplash.com/photo-1589859546059-43c3329f635f?w=600&q=80', // watermelon juice
  'Cà Phê Sữa Đá': 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&q=80', // iced coffee
  'Trà Đào Cam Sả': 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80', // peach tea
  'Sinh Tố Bơ': 'https://images.unsplash.com/photo-1604423043492-4138e514f86a?w=600&q=80', // avocado smoothie
  'Nước Cam Vắt': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80', // orange juice
  'Trà Matcha Latte': 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=600&q=80', // matcha
  'Hồng Trà Macchiato': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80', // iced tea
  'Sinh Tố Dâu': 'https://images.unsplash.com/photo-1638883640707-160bc7061c56?w=600&q=80', // strawberry smoothie
  'Nước Ép Táo': 'https://images.unsplash.com/photo-1560155016-bd4879ae8f21?w=600&q=80', // apple juice

  // Foodshop
  'Cơm Tấm Sườn Bì Chả': 'https://images.unsplash.com/photo-1651815143492-f0fec29cc0e8?w=600&q=80', // rice dish
  'Phở Bò Tái Nạm': 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&q=80', // pho
  'Bún Bò Huế': 'https://images.unsplash.com/photo-1662985390772-5e6837c7689d?w=600&q=80', // noodle soup
  'Pizza Hải Sản': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80', // pizza
  'Burger Bò Phô Mai': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80', // burger
  'Bánh Mì Thịt Nướng': 'https://images.unsplash.com/photo-1630431341973-02e1b662ce3b?w=600&q=80', // banh mi / sandwich
  'Mì Ý Sốt Bò Băm': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80', // pasta
  'Gà Rán Giòn': 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&q=80', // fried chicken
  'Salad Cá Ngừ': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80', // salad
  'Sushi Tổng Hợp': 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80', // sushi

  // Techstore
  'Laptop Gaming ASUS ROG': 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&q=80', // gaming laptop
  'MacBook Pro M3 14-inch': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80', // macbook
  'Tai Nghe Bluetooth Sony': 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&q=80', // headphones
  'Bàn Phím Cơ Logitech': 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=600&q=80', // mechanical keyboard
  'Chuột Gaming Razer': 'https://images.unsplash.com/photo-1527814050087-379381547994?w=600&q=80', // gaming mouse
  'Màn Hình Dell UltraSharp 27"': 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80', // monitor
  'iPhone 15 Pro Max': 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80', // iphone
  'Samsung Galaxy S24 Ultra': 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&q=80', // samsung phone
  'iPad Air 5': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80', // ipad
  'Loa Bluetooth JBL': 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80', // bluetooth speaker

  // Fashionhub
  'Áo Thun Cotton Nam': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80', // t-shirt
  'Váy Hoa Nhí Nữ': 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80', // dress
  'Quần Jean Ống Rộng': 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80', // jeans
  'Áo Khoác Denim': 'https://images.unsplash.com/photo-1551537482-f209bfc44383?w=600&q=80', // denim jacket
  'Áo Sơ Mi Trắng': 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ce3?w=600&q=80', // white shirt
  'Đầm Dạ Hội Cao Cấp': 'https://images.unsplash.com/photo-1566160983987-a22dd04085f1?w=600&q=80', // evening gown
  'Quần Tây Nam Lịch Lãm': 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80', // trousers
  'Áo Hoodie Form Rộng': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80', // hoodie
  'Giày Sneaker Thời Trang': 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80', // sneakers
  'Túi Xách Da Nữ': 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=600&q=80', // handbag

  // Sportsworld
  'Giày Chạy Bộ Nike Air': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', // nike running shoes
  'Vợt Cầu Lông Yonex': 'https://images.unsplash.com/photo-1622279457486-62dcc4a631d1?w=600&q=80', // badminton
  'Quả Bóng Đá Hạng Nặng': 'https://images.unsplash.com/photo-1614632537190-23e4146777db?w=600&q=80', // football
  'Thảm Tập Yoga Cao Su': 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&q=80', // yoga mat
  'Bộ Tạ Tay Đa Năng': 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80', // dumbbells
  'Balo Thể Thao Chống Nước': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80', // sports backpack
  'Bình Nước Giữ Nhiệt Lõi Inox': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80', // water bottle
  'Quần Thể Thao Co Giãn': 'https://images.unsplash.com/photo-1515562141207-7a8ef25ce98c?w=600&q=80', // sweatpants
  'Áo Lót Thể Thao Nữ': 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?w=600&q=80', // sports bra
  'Kính Bơi Chống Lóa': 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=80', // swimming goggles

  // Bookwormbooks
  'Đắc Nhân Tâm': 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&q=80', // classic book
  'Nhà Giả Kim': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=80', // novel
  'Dấu Chân Trên Cát': 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&q=80', // open book
  'Sapiens Lược Sử Loài Người': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80', // reading history
  'Nghĩ Giàu Làm Giàu': 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=600&q=80', // business book
  'Tony Buổi Sáng - Trên Đường Băng': 'https://images.unsplash.com/photo-1455390582262-044cdead2708?w=600&q=80', // coffee and book
  'Tâm Lý Học Tội Phạm': 'https://images.unsplash.com/photo-1587778082149-bd5b1bf5d3fa?w=600&q=80', // dark book
  'Sherlock Holmes Toàn Tập': 'https://images.unsplash.com/photo-1626618012641-bfbca5a5d239?w=600&q=80', // mystery
  'Harry Potter Và Hòn Đá Phù Thủy': 'https://images.unsplash.com/photo-1618666012174-83b441c0bc76?w=600&q=80', // magic book
  'Tuổi Trẻ Đáng Giá Bao Nhiêu': 'https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?w=600&q=80', // youth book

  // Homecozy
  'Sofa Bọc Nỉ Cao Cấp': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80', // sofa
  'Đèn Ngủ Cảm Ứng Thông Minh': 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80', // lamp
  'Thảm Trải Sàn Sang Trọng': 'https://images.unsplash.com/photo-1574843516091-a89270e59ee6?w=600&q=80', // rug
  'Rèm Cửa Chống Nắng': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&q=80', // curtains
  'Bộ Chăn Drap Gối Nệm Cotton': 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&q=80', // bed
  'Bàn Làm Việc Gỗ Xồi': 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&q=80', // desk
  'Ghế Công Thái Học': 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=600&q=80', // office chair
  'Tranh Treo Tường Nghệ Thuật': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&q=80', // wall art
  'Kệ Sách Gỗ Treo Tường': 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=600&q=80', // bookshelf
  'Máy Lọc Không Khí Gia Đình': 'https://images.unsplash.com/photo-1585226175024-81e0eab0213b?w=600&q=80', // air purifier
};

async function main() {
  try {
    const { data: products, error: pErr } = await supabase.from('products').select('id, name');
    if (pErr) throw pErr;
    console.log(`Found ${products.length} products to map specific images.`);

    let updateCount = 0;
    
    for (const prod of products) {
      const specificImage = nameToImageMap[prod.name];
      
      if (specificImage) {
        const { error: updateErr } = await supabase.from('products').update({ image_url: specificImage }).eq('id', prod.id);
        if (updateErr) {
            console.error(`Failed to update product ${prod.id}:`, updateErr.message);
        } else {
            updateCount++;
            if (updateCount % 20 === 0) console.log(`Mapped ${updateCount} products...`);
        }
      }
    }

    console.log(`✅ Successfully mapped accurate images for ${updateCount} products!`);

  } catch (err) {
    console.error('Script error:', err);
  }
}

main();
