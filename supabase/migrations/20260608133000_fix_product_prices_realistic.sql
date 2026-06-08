
-- Fix product prices to be realistic VND amounts (multiply by 10,000)
-- Also verify/update product images if needed
UPDATE products SET 
    price = price * 10000;

-- Update discount percentages if needed (optional, but keep current for now)

