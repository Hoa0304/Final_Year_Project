require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const categoryImages = {
  'Drinks': [
    'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80', // juice
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80', // coffee
    'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80' // tea
  ],
  'Food': [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80', // dish
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80', // burger
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80' // pizza
  ],
  'Electronics': [
    'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&q=80', // desk setup
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80', // headphones
    'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600&q=80', // keyboard/mouse
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80' // macbook
  ],
  'Clothing': [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80', // t-shirt
    'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80', // jeans
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80' // jacket
  ],
  'Sports': [
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80', // weights
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', // shoes
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&q=80' // running
  ],
  'Books': [
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=80', // book
    'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&q=80', // books
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80' // reading
  ],
  'Home': [
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&q=80', // sofa
    'https://images.unsplash.com/photo-1583847268964-b28ce8fba3f3?w=600&q=80', // room
    'https://images.unsplash.com/photo-1505693314120-0d443867891c?w=600&q=80' // decor
  ]
};

async function main() {
  try {
    const { data: products, error: pErr } = await supabase.from('products').select('id, name, category, price');
    if (pErr) throw pErr;
    console.log(`Found ${products.length} products to update images and prices.`);

    let updateCount = 0;
    
    for (const prod of products) {
      let newPrice = prod.price;
      const lowerName = prod.name.toLowerCase();
      
      // Fix prices for accessories
      if (lowerName.includes('chuột') || lowerName.includes('bàn phím') || lowerName.includes('tai nghe')) {
        newPrice = randomInt(200, 400) * 1000; // 200k to 400k
      }

      // Assign an image based on category
      const images = categoryImages[prod.category] || [ 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80' ];
      
      // Try to be slightly smart about images
      let imgIndex = 0;
      if (prod.category === 'Electronics') {
        if (lowerName.includes('tai nghe')) imgIndex = 1;
        else if (lowerName.includes('chuột') || lowerName.includes('bàn phím')) imgIndex = 2;
        else if (lowerName.includes('macbook') || lowerName.includes('laptop')) imgIndex = 3;
        else imgIndex = 0;
      } else if (prod.category === 'Food') {
        if (lowerName.includes('burger')) imgIndex = 1;
        else if (lowerName.includes('pizza')) imgIndex = 2;
        else imgIndex = 0;
      } else if (prod.category === 'Clothing') {
        if (lowerName.includes('jean')) imgIndex = 1;
        else if (lowerName.includes('khoác')) imgIndex = 2;
        else imgIndex = 0;
      } else if (prod.category === 'Sports') {
        if (lowerName.includes('giày')) imgIndex = 1;
        else imgIndex = 0;
      } else {
        // Randomly pick one for variety
        imgIndex = Math.floor(Math.random() * images.length);
      }

      const imageUrl = images[imgIndex];

      const updates = {
        image_url: imageUrl,
        price: newPrice
      };

      const { error: updateErr } = await supabase.from('products').update(updates).eq('id', prod.id);
      if (updateErr) {
          console.error(`Failed to update product ${prod.id}:`, updateErr.message);
      } else {
          updateCount++;
          if (updateCount % 20 === 0) console.log(`Updated ${updateCount} products...`);
      }
    }

    console.log(`✅ Successfully added images and adjusted prices for ${updateCount} products!`);

  } catch (err) {
    console.error('Script error:', err);
  }
}

main();
