export const CATEGORY_TRANSLATIONS: Record<string, string> = {
  // Transaction Categories
  Shopping: 'Mua sắm',
  Electronics: 'Điện tử',
  Entertainment: 'Giải trí',
  Earnings: 'Thu nhập',
  Investment: 'Đầu tư',
  Food: 'Ăn uống',
  Transportation: 'Di chuyển',
  Bills: 'Hóa đơn',
  Reward: 'Phần thưởng',
  Other: 'Khác',

  // Product Categories
  'Clothing': 'Quần áo',
  'Books': 'Sách',
  'Home & Garden': 'Nhà cửa & Đời sống',
  'Sports': 'Thể thao',
  'Toys': 'Đồ chơi',
  'Health & Beauty': 'Sức khỏe & Làm đẹp',
  'Automotive': 'Ô tô & Xe máy',
  'Food & Grocery': 'Thực phẩm',
  'Digital Services': 'Dịch vụ số',
  'Software': 'Phần mềm',
  'Courses': 'Khóa học',
  'Fashion': 'Thời trang',
  'Accessories': 'Phụ kiện',
  'Gaming': 'Trò chơi',
  'Education': 'Giáo dục',
  'Beauty': 'Làm đẹp',
  'Home': 'Nhà cửa',
  'clothing': 'Quần áo',
  'education': 'Giáo dục',
  'beauty': 'Làm đẹp',
  'home': 'Nhà cửa',
  'sports': 'Thể thao',
};

export function translateCategory(category: string | undefined | null): string {
  if (!category) return 'Khác';
  return CATEGORY_TRANSLATIONS[category] || category;
}

export const TRANSACTION_TYPE_TRANSLATIONS: Record<string, string> = {
  spend: 'Chi tiêu',
  earn: 'Thu nhập',
  task_reward: 'Thưởng nhiệm vụ',
  game_reward: 'Thưởng game',
  stock_profit: 'Lãi chứng khoán',
  stock_loss: 'Lỗ chứng khoán',
  grant: 'Được tặng',
  revoke: 'Thu hồi',
  order: 'Đơn hàng',
};

export function translateTransactionType(type: string | undefined | null): string {
  if (!type) return 'Giao dịch';
  return TRANSACTION_TYPE_TRANSLATIONS[type] || type;
}



export const TASK_TITLE_TRANSLATIONS: Record<string, string> = {
  'Daily Check-in': 'Điểm danh hằng ngày',
  'Daily Login': 'Đăng nhập hằng ngày',
  'First Purchase': 'Mua hàng lần đầu',
  'Purchase 3 Items': 'Mua 3 sản phẩm',
  'Review a Product': 'Đánh giá sản phẩm',
  'Task Master': 'Hoàn thành 5 nhiệm vụ',
  'Buy Electronics': 'Mua đồ điện tử',
  'Stock Trader': 'Giao dịch chứng khoán',
  'Play 3 Games': 'Chơi 3 trò chơi',
  'Complete Profile': 'Hoàn thiện hồ sơ'
};

export const TASK_DESC_TRANSLATIONS: Record<string, string> = {
  'Log in to the app daily to earn coins.': 'Đăng nhập ứng dụng hằng ngày để nhận xu.',
  'Login to the app today': 'Đăng nhập vào ứng dụng hôm nay',
  'Make your first product purchase': 'Thực hiện mua sản phẩm đầu tiên',
  'Make your first purchase on the marketplace.': 'Thực hiện mua hàng lần đầu trên chợ.',
  'Buy any 3 items from the marketplace.': 'Mua 3 sản phẩm bất kỳ trên chợ.',
  'Leave a review on a product you purchased.': 'Để lại đánh giá cho sản phẩm bạn đã mua.',
  'Complete 5 tasks to earn a bonus reward.': 'Hoàn thành 5 nhiệm vụ để nhận phần thưởng thêm.',
  'Complete 3 tasks': 'Hoàn thành 3 nhiệm vụ',
  'Purchase any electronics item.': 'Mua bất kỳ sản phẩm điện tử nào.',
  'Make your first stock trade.': 'Thực hiện giao dịch chứng khoán đầu tiên.',
  'Play 3 mini-games in the arcade.': 'Chơi 3 trò chơi nhỏ trong khu giải trí.',
  'Fill out your complete profile information': 'Điền đầy đủ thông tin hồ sơ của bạn'
};

export function translateTaskTitle(title: string | undefined | null): string {
  if (!title) return '';
  return TASK_TITLE_TRANSLATIONS[title] || title;
}

export function translateTaskDesc(desc: string | undefined | null): string {
  if (!desc) return '';
  return TASK_DESC_TRANSLATIONS[desc] || desc;
}

export function translateDescription(desc: string | undefined | null, type: string | undefined | null): string {
  if (!desc) return translateTransactionType(type);
  if (desc.startsWith('Task reward: ')) {
    const taskName = desc.replace('Task reward: ', '');
    return `Thưởng nhiệm vụ: ${translateTaskTitle(taskName)}`;
  }
  if (desc.startsWith('Order #')) {
    return desc.replace('Order #', 'Đơn hàng #');
  }
  if (desc.startsWith('VND Sale (mock) - order ')) {
    return desc.replace('VND Sale (mock) - order ', 'Bán hàng VND (thử nghiệm) - đơn ');
  }
  if (desc.includes('Shopee coin offset')) {
    return desc.replace('Shopee coin offset', 'Sử dụng xu Shopee');
  }
  if (desc === 'Seeded Coin Spend for Order') {
    return 'Tiêu xu mua hàng (khởi tạo)';
  }
  if (desc === 'Seeded Sale Earn for Order') {
    return 'Nhận xu bán hàng (khởi tạo)';
  }
  if (desc.startsWith('Manual label update')) {
    return 'Cập nhật nhãn thủ công';
  }
  return desc;
}
