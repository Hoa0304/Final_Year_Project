-- Fix the discount_applied column type which was restricted to DECIMAL(5, 2) causing overflow errors
ALTER TABLE orders ALTER COLUMN discount_applied TYPE DECIMAL(15, 2);
