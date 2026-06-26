const fs = require('fs');
const content = \
export const TASK_TITLE_TRANSLATIONS: Record<string, string> = {
  'Daily Check-in': 'Ði?m danh h?ng ngày',
  'First Purchase': 'Mua hàng l?n d?u',
  'Purchase 3 Items': 'Mua 3 s?n ph?m',
  'Review a Product': 'Ðánh giá s?n ph?m',
  'Task Master': 'Hoàn thành 5 nhi?m v?',
  'Buy Electronics': 'Mua d? di?n t?',
  'Stock Trader': 'Giao d?ch ch?ng khoán',
  'Play 3 Games': 'Choi 3 trò choi'
};

export const TASK_DESC_TRANSLATIONS: Record<string, string> = {
  'Log in to the app daily to earn coins.': 'Ðang nh?p ?ng d?ng h?ng ngày d? nh?n xu.',
  'Make your first purchase on the marketplace.': 'Th?c hi?n giao d?ch mua hàng d?u tiên c?a b?n trên ch?.',
  'Buy any 3 items from the marketplace.': 'Mua 3 s?n ph?m b?t k? trên ch?.',
  'Leave a review on a product you purchased.': 'Ð? l?i dánh giá cho s?n ph?m b?n dã mua.',
  'Complete 5 tasks to earn a bonus reward.': 'Hoàn thành 5 nhi?m v? d? nh?n ph?n thu?ng thêm.',
  'Purchase any electronics item.': 'Mua b?t k? s?n ph?m di?n t? nào.',
  'Make your first stock trade.': 'Th?c hi?n giao d?ch ch?ng khoán d?u tiên.',
  'Play 3 mini-games in the arcade.': 'Choi 3 trò choi nh? trong khu gi?i trí.'
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
    return \\\Thu?ng nhi?m v?: \\\\;
  }
  if (desc.startsWith('Order #')) {
    return desc.replace('Order #', 'Ðon hàng #');
  }
  if (desc.startsWith('Manual label update')) {
    return 'C?p nh?t nhãn th? công';
  }
  return desc;
}
\;

fs.appendFileSync('d:/da/HMall/frontend/src/utils/category.utils.ts', content, 'utf8');

