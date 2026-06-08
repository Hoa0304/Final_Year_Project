-- Migration: Fix product prices to be reasonable with new 10-coin initial balance
-- và update task rewards to be whole numbers without decimals

-- Update task reward amounts to whole numbers (no trailing zeros)
-- These are already whole numbers but set DECIMAL precision to avoid .00 display
UPDATE tasks SET reward_amount = 50 WHERE title = 'Complete Profile';
UPDATE tasks SET reward_amount = 100 WHERE title = 'First Purchase';
UPDATE tasks SET reward_amount = 10 WHERE title = 'Daily Login';
UPDATE tasks SET reward_amount = 150 WHERE title = 'Stock Trader';
UPDATE tasks SET reward_amount = 200 WHERE title = 'Task Master';

-- Update ALL existing product prices to reasonable coin amounts
-- Conversion: 1 xu = 10,000 VND
-- Laptop ~10-15M VND = 1000-1500 xu → keep reasonable range
-- Update seeded sample products prices
UPDATE products SET price = 2
  WHERE name = 'Mouse';
UPDATE products SET price = 3
  WHERE name = 'Keyboard';
UPDATE products SET price = 5
  WHERE name = 'Headphones';
UPDATE products SET price = 8
  WHERE name = 'Speaker';
UPDATE products SET price = 10
  WHERE name = 'Book';
UPDATE products SET price = 15
  WHERE name = 'Watch';
UPDATE products SET price = 20
  WHERE name = 'Shoes';
UPDATE products SET price = 25
  WHERE name = 'Course';
UPDATE products SET price = 30
  WHERE name = 'Tablet';
UPDATE products SET price = 40
  WHERE name = 'Camera';
UPDATE products SET price = 50
  WHERE name = 'Laptop';
UPDATE products SET price = 60
  WHERE name = 'Smartphone';

-- Ensure no product has price = 0
UPDATE products SET price = 1 WHERE price = 0 OR price IS NULL;

-- Update discounted_price if it exists (it should = price * 0.9 but let backend handle it)
-- Update the column if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'products' AND column_name = 'discounted_price') THEN
    UPDATE products SET discounted_price = ROUND(price * 0.9, 2) WHERE discounted_price IS NOT NULL;
  END IF;
END $$;
