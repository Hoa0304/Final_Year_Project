
-- Add admin user
DO $$
BEGIN
  INSERT INTO users (email, password_hash, full_name, role, virtual_balance)
  VALUES (
    'admin@hmall.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- password is "password"
    'Admin User',
    'admin',
    1000000
  )
  ON CONFLICT (email) DO NOTHING;
END $$;
