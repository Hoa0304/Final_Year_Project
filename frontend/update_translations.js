const fs = require('fs');
let content = fs.readFileSync('src/utils/category.utils.ts', 'utf8');

// Update TASK_TITLE_TRANSLATIONS
content = content.replace(
  /'Daily Check-in': 'Ði?m danh h?ng ngày',/,
  \'Daily Check-in': 'Ði?m danh h?ng ngày',
  'Daily Login': 'Ðang nh?p h?ng ngày',
  'Complete Profile': 'Hoàn thi?n h? so',\
);

// Update TASK_DESC_TRANSLATIONS
content = content.replace(
  /'Log in to the app daily to earn coins.': 'Ðang nh?p ?ng d?ng h?ng ngày d? nh?n xu.',/,
  \'Log in to the app daily to earn coins.': 'Ðang nh?p ?ng d?ng h?ng ngày d? nh?n xu.',
  'Login to the app today': 'Ðang nh?p vào ?ng d?ng hôm nay',
  'Fill out your complete profile information': 'Ði?n d?y d? thông tin h? so c?a b?n',
  'Make your first product purchase': 'Th?c hi?n mua s?n ph?m d?u tiên',
  'Complete 3 tasks': 'Hoàn thành 3 nhi?m v?',\
);

// Update translateDescription for transactions
content = content.replace(
  /if \\(desc\\.startsWith\\('Order #'\\)\\) \\{/,
  \if (desc.startsWith('Order #')) {
    return desc.replace('Order #', 'Ðon hàng #');
  }
  if (desc.startsWith('VND Sale (mock) - order ')) {
    return desc.replace('VND Sale (mock) - order ', 'Bán hàng VND (th? nghi?m) - don ');
  }
  if (desc === 'Seeded Coin Spend for Order') {
    return 'Tiêu xu mua hàng (kh?i t?o)';
  }
  if (desc === 'Seeded Sale Earn for Order') {
    return 'Nh?n xu bán hàng (kh?i t?o)';
  }
  if (desc.startsWith('Order ')'/,
);

fs.writeFileSync('src/utils/category.utils.ts', content, 'utf8');

const fs = require('fs');
let content = fs.readFileSync('src/utils/category.utils.ts', 'utf8');

// Add transaction translation logic
if (!content.includes('Shopee coin offset')) {
  content = content.replace(
    /if \\(desc === 'Seeded Coin Spend for Order'\\) \\{/,
    \if (desc.includes('Shopee coin offset')) {
    return desc.replace('Shopee coin offset', 'S? d?ng xu Shopee');
  }
  if (desc === 'Seeded Coin Spend for Order') {\
  );
}

fs.writeFileSync('src/utils/category.utils.ts', content, 'utf8');

