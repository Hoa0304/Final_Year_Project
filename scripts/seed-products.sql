-- Seed Products Script
-- Run this in Supabase Studio SQL Editor if products table is empty

INSERT INTO products (name, description, price, category, stock_quantity, image_url, is_active)
VALUES
    ('Laptop', 'High-performance laptop for your digital workspace', 500.00, 'Electronics', 100, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&h=500&fit=crop', true),
    ('Smartphone', 'Latest smartphone with all features', 300.00, 'Electronics', 150, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop', true),
    ('Headphones', 'Premium headphones for immersive experience', 100.00, 'Electronics', 200, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop', true),
    ('Watch', 'Smart watch with fitness tracking', 200.00, 'Accessories', 100, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop', true),
    ('Book', 'Educational book collection', 50.00, 'Education', 500, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&h=500&fit=crop', true),
    ('Tablet', 'Portable tablet for work and entertainment', 400.00, 'Electronics', 80, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&h=500&fit=crop', true),
    ('Camera', 'Professional camera for photography', 600.00, 'Electronics', 50, 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500&h=500&fit=crop', true),
    ('Keyboard', 'Mechanical keyboard for typing', 150.00, 'Accessories', 120, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&h=500&fit=crop', true),
    ('Mouse', 'Ergonomic mouse for productivity', 80.00, 'Accessories', 150, 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500&h=500&fit=crop', true),
    ('Course', 'Online course for skill development', 250.00, 'Education', 300, 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&h=500&fit=crop', true)
ON CONFLICT DO NOTHING;

-- Verify products were inserted
SELECT id, name, price, stock_quantity, image_url, is_active FROM products;
