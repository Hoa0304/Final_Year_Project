-- Script to delete product "Hi" (including all related records)
-- Run this in Supabase SQL Editor

-- Step 1: First, find the product ID
SELECT id, name FROM products WHERE name = 'Hi';

-- Step 2: Delete all related records first (you might want to back them up first!)
-- Delete shopping cart entries
DELETE FROM shopping_cart WHERE product_id = (SELECT id FROM products WHERE name = 'Hi');

-- Delete product ratings/reviews
DELETE FROM product_ratings WHERE product_id = (SELECT id FROM products WHERE name = 'Hi');

-- Delete product reviews from enterprise expansion
DELETE FROM product_reviews WHERE product_id = (SELECT id FROM products WHERE name = 'Hi');

-- Delete orders (IMPORTANT: This removes order history! Be careful!)
-- If you want to keep orders but delete the product, you can set product_id to NULL first
-- ALTER TABLE orders ALTER COLUMN product_id DROP NOT NULL;
-- UPDATE orders SET product_id = NULL WHERE product_id = (SELECT id FROM products WHERE name = 'Hi');
-- But if you want to delete orders too:
DELETE FROM orders WHERE product_id = (SELECT id FROM products WHERE name = 'Hi');

-- Step 3: Finally delete the product!
DELETE FROM products WHERE name = 'Hi';

-- Verify the product is gone
SELECT id, name FROM products WHERE name = 'Hi';
