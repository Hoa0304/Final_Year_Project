
-- Add a test user
INSERT INTO users (email, password_hash, full_name, role, virtual_balance)
VALUES (
  'testuser@hmall.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- password is "password"
  'Test User',
  'user',
  100000
)
ON CONFLICT (email) DO NOTHING;

-- Get the test user and a product to create an order
DO $$
DECLARE
  v_user_id UUID;
  v_product_id UUID;
  v_order_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = 'testuser@hmall.com' LIMIT 1;
  SELECT id INTO v_product_id FROM products LIMIT 1;

  -- Insert test order
  INSERT INTO orders (user_id, product_id, quantity, total_amount, status)
  VALUES (v_user_id, v_product_id, 1, 50, 'completed')
  RETURNING id INTO v_order_id;

  -- Insert test rating
  INSERT INTO product_ratings (user_id, product_id, rating, review_text)
  VALUES (v_user_id, v_product_id, 5, 'Sản phẩm rất tốt!')
  ON CONFLICT (user_id, product_id) DO NOTHING;
END $$;
