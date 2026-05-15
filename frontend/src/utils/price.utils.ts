/**
 * Price calculation utilities for handling discounts
 * Ensures consistent price calculations across frontend and backend
 */

/**
 * Calculate the discounted price based on original price and discount percentage
 * @param originalPrice - The original price of the product
 * @param discountPercentage - The discount percentage (0-100), or null/undefined for no discount
 * @returns The discounted price, or original price if no discount
 */
export function calculateDiscountedPrice(
  originalPrice: number,
  discountPercentage: number | null | undefined
): number {
  // If no discount, return original price
  if (!discountPercentage || discountPercentage <= 0) {
    return originalPrice;
  }

  // Ensure discount is not greater than 100%
  const validDiscount = Math.min(discountPercentage, 100);

  // Calculate discounted price: originalPrice * (1 - discountPercentage / 100)
  const discountMultiplier = 1 - validDiscount / 100;
  const discountedPrice = originalPrice * discountMultiplier;

  // Round to 2 decimal places for currency
  return Math.round(discountedPrice * 100) / 100;
}

/**
 * Calculate the discount amount (savings)
 * @param originalPrice - The original price of the product
 * @param discountPercentage - The discount percentage (0-100), or null/undefined for no discount
 * @returns The discount amount (how much the customer saves)
 */
export function calculateDiscountAmount(
  originalPrice: number,
  discountPercentage: number | null | undefined
): number {
  if (!discountPercentage || discountPercentage <= 0) {
    return 0;
  }

  const validDiscount = Math.min(discountPercentage, 100);
  const discountAmount = originalPrice * (validDiscount / 100);

  // Round to 2 decimal places
  return Math.round(discountAmount * 100) / 100;
}

/**
 * Validate discount percentage
 * @param discountPercentage - The discount percentage to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateDiscountPercentage(
  discountPercentage: number | null | undefined
): { isValid: boolean; error?: string } {
  // null or undefined means no discount (valid)
  if (discountPercentage === null || discountPercentage === undefined) {
    return { isValid: true };
  }

  // Must be a number
  if (typeof discountPercentage !== 'number' || isNaN(discountPercentage)) {
    return { isValid: false, error: 'Discount percentage must be a number' };
  }

  // Must be between 0 and 100
  if (discountPercentage < 0) {
    return { isValid: false, error: 'Discount percentage cannot be negative' };
  }

  if (discountPercentage > 100) {
    return { isValid: false, error: 'Discount percentage cannot exceed 100%' };
  }

  return { isValid: true };
}






















