-- Debug script to check why product "Hi" can't be deleted
-- Run this in Supabase SQL Editor

-- First find the product ID
SELECT id, name FROM products WHERE name = 'Hi';

-- Then check all tables that might reference the product
SELECT 'order_items' AS table, COUNT(*) AS count
FROM order_items WHERE product_id = (SELECT id FROM products WHERE name = 'Hi');

SELECT 'favorites' AS table, COUNT(*) AS count
FROM favorites WHERE product_id = (SELECT id FROM products WHERE name = 'Hi');

SELECT 'product_views' AS table, COUNT(*) AS count
FROM product_views WHERE product_id = (SELECT id FROM products WHERE name = 'Hi');

-- If you need to delete all related records first (WARNING: This removes data!)
-- Uncomment the following lines to delete related records first:
-- DELETE FROM order_items WHERE product_id = (SELECT id FROM products WHERE name = 'Hi');
-- DELETE FROM favorites WHERE product_id = (SELECT id FROM products WHERE name = 'Hi');
-- DELETE FROM product_views WHERE product_id = (SELECT id FROM products WHERE name = 'Hi');
-- Then delete the product:
-- DELETE FROM products WHERE name = 'Hi';
