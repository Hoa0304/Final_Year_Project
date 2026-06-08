-- Migration: Seed Many Vendors with Many Products
-- =============================================

-- 1. Create Vendor Users
INSERT INTO users (email, password_hash, full_name, role, virtual_balance, created_at)
VALUES
    ('techstore@hmall.com', '$2a$10$XGgIvusP18s5YZ1v8UaMdeeGqMO9v2LrHxlVdkDXIQxoMGnGInBzS', 'Tech Store', 'vendor', 0, NOW()),
    ('fashionhub@hmall.com', '$2a$10$XGgIvusP18s5YZ1v8UaMdeeGqMO9v2LrHxlVdkDXIQxoMGnGInBzS', 'Fashion Hub', 'vendor', 0, NOW()),
    ('bookwormbooks@hmall.com', '$2a$10$XGgIvusP18s5YZ1v8UaMdeeGqMO9v2LrHxlVdkDXIQxoMGnGInBzS', 'Bookworm Books', 'vendor', 0, NOW()),
    ('homecozy@hmall.com', '$2a$10$XGgIvusP18s5YZ1v8UaMdeeGqMO9v2LrHxlVdkDXIQxoMGnGInBzS', 'Home Cozy', 'vendor', 0, NOW()),
    ('sportsworld@hmall.com', '$2a$10$XGgIvusP18s5YZ1v8UaMdeeGqMO9v2LrHxlVdkDXIQxoMGnGInBzS', 'Sports World', 'vendor', 0, NOW())
ON CONFLICT DO NOTHING;

-- 2. Add Products for Tech Store (Vendor 1)
INSERT INTO products (name, description, price, category, stock_quantity, image_url, is_active, created_by)
SELECT 
    'Laptop', 'High-performance laptop for work and gaming', 50, 'Electronics', 10, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'techstore@hmall.com')
UNION ALL
SELECT 
    'Smartphone', 'Latest smartphone with all features', 30, 'Electronics', 15, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'techstore@hmall.com')
UNION ALL
SELECT 
    'Headphones', 'Premium noise-canceling headphones', 25, 'Electronics', 20, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'techstore@hmall.com')
UNION ALL
SELECT 
    'Smart Watch', 'Fitness and health tracking watch', 15, 'Electronics', 10, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'techstore@hmall.com')
ON CONFLICT DO NOTHING;

-- 3. Add Products for Fashion Hub (Vendor 2)
INSERT INTO products (name, description, price, category, stock_quantity, image_url, is_active, created_by)
SELECT 
    'T-Shirt', 'Cotton casual t-shirt', 8, 'Fashion', 50, 'https://images.unsplash.com/photo-1521572163474-6864f81c090?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'fashionhub@hmall.com')
UNION ALL
SELECT 
    'Jeans', 'Classic denim jeans', 18, 'Fashion', 30, 'https://images.unsplash.com/photo-1542272604-787c3835535?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'fashionhub@hmall.com')
UNION ALL
SELECT 
    'Jacket', 'Winter jacket for cold weather', 30, 'Fashion', 15, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'fashionhub@hmall.com')
UNION ALL
SELECT 
    'Sneakers', 'Comfortable running sneakers', 22, 'Fashion', 25, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'fashionhub@hmall.com')
ON CONFLICT DO NOTHING;

-- 4. Add Products for Bookworm Books (Vendor 3)
INSERT INTO products (name, description, price, category, stock_quantity, image_url, is_active, created_by)
SELECT 
    'Programming Book', 'Learn Python programming', 5, 'Education', 40, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'bookwormbooks@hmall.com')
UNION ALL
SELECT 
    'Fiction Novel', 'Bestselling fiction story', 4, 'Education', 60, 'https://images.unsplash.com/photo-1528820646530-987792e723c8?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'bookwormbooks@hmall.com')
UNION ALL
SELECT 
    'History Book', 'World history overview', 7, 'Education', 25, 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'bookwormbooks@hmall.com')
UNION ALL
SELECT 
    'Self-Help Guide', 'Personal development book', 6, 'Education', 35, 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'bookwormbooks@hmall.com')
ON CONFLICT DO NOTHING;

-- 5. Add Products for Home Cozy (Vendor 4)
INSERT INTO products (name, description, price, category, stock_quantity, image_url, is_active, created_by)
SELECT 
    'Lamp', 'Desk lamp for study', 12, 'Home', 20, 'https://images.unsplash.com/photo-1507473885765-e0380a5656b0?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'homecozy@hmall.com')
UNION ALL
SELECT 
    'Coffee Mug', 'Ceramic coffee mug', 3, 'Home', 80, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'homecozy@hmall.com')
UNION ALL
SELECT 
    'Plant Pot', 'Decorative plant pot', 8, 'Home', 30, 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'homecozy@hmall.com')
UNION ALL
SELECT 
    'Blanket', 'Soft warm blanket', 15, 'Home', 15, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'homecozy@hmall.com')
ON CONFLICT DO NOTHING;

-- 6. Add Products for Sports World (Vendor 5)
INSERT INTO products (name, description, price, category, stock_quantity, image_url, is_active, created_by)
SELECT 
    'Basketball', 'Professional basketball', 10, 'Sports', 25, 'https://images.unsplash.com/photo-1519861531473-917000864b75?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'sportsworld@hmall.com')
UNION ALL
SELECT 
    'Yoga Mat', 'Non-slip yoga mat', 8, 'Sports', 35, 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'sportsworld@hmall.com')
UNION ALL
SELECT 
    'Dumbbells', 'Pair of 10kg dumbbells', 20, 'Sports', 15, 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'sportsworld@hmall.com')
UNION ALL
SELECT 
    'Tennis Racket', 'Carbon fiber tennis racket', 28, 'Sports', 10, 'https://images.unsplash.com/photo-1546519636-874b309f7946?w=500&h=500&fit=crop', true, (SELECT id FROM users WHERE email = 'sportsworld@hmall.com')
ON CONFLICT DO NOTHING;
