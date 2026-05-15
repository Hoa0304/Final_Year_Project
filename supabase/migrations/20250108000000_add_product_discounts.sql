-- Add discount_percentage field to products table
-- This allows vendors to set discount percentages (0-100) on their products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT NULL 
CHECK (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100));

-- Add comment to explain the field
COMMENT ON COLUMN products.discount_percentage IS 'Discount percentage (0-100) applied to product price. NULL means no discount.';

-- Create index for faster queries on discounted products
CREATE INDEX IF NOT EXISTS idx_products_discount_percentage 
ON products(discount_percentage) 
WHERE discount_percentage IS NOT NULL AND discount_percentage > 0;






















