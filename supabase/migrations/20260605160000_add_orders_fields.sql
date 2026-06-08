-- Add missing columns to orders table to support the new Express orders and vendor management system
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_coins DECIMAL(15, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_vnd DECIMAL(15, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_price_coins DECIMAL(15, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_applied DECIMAL(5, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(100);

-- Drop existing view first to allow column type changes
DROP VIEW IF EXISTS purchase_history;

-- Update status column type to allow new status enum values Conceptual representation
ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(50);

-- Make legacy total_amount column nullable with a default value of 0
ALTER TABLE orders ALTER COLUMN total_amount DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN total_amount SET DEFAULT 0.00;

-- Recreate view
CREATE VIEW purchase_history AS
SELECT 
    o.id AS order_id,
    o.user_id,
    o.product_id,
    o.quantity,
    o.total_amount,
    o.status,
    o.created_at AS purchased_at,
    p.name AS product_name,
    p.image_url AS product_image,
    p.category AS product_category,
    p.price AS product_price_at_purchase,
    t.id AS transaction_id,
    t.description AS transaction_description,
    tl.label AS transaction_label
FROM orders o
LEFT JOIN products p ON o.product_id = p.id
LEFT JOIN transactions t ON t.reference_id = o.id AND t.reference_type = 'order'
LEFT JOIN transaction_labels tl ON tl.transaction_id = t.id
ORDER BY o.created_at DESC;
