-- Add random_voucher_ids field to products table
-- This allows vendors/admins to specify which vouchers can be randomly issued after purchase
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS random_voucher_ids UUID[] DEFAULT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN products.random_voucher_ids IS 'Array of voucher IDs that can be randomly issued to users after purchasing this product. If NULL, all claimable vouchers from the vendor are eligible.';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_random_voucher_ids 
ON products USING GIN(random_voucher_ids);

















