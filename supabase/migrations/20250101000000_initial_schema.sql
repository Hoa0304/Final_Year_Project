-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE transaction_type AS ENUM ('earn', 'spend', 'grant', 'revoke', 'task_reward', 'stock_profit', 'stock_loss');
CREATE TYPE task_status AS ENUM ('pending', 'completed', 'claimed');
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role user_role DEFAULT 'user',
    virtual_balance DECIMAL(15, 2) DEFAULT 1000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(15, 2) NOT NULL,
    image_url VARCHAR(500),
    category VARCHAR(100),
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reward_amount DECIMAL(15, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User tasks (track task completion)
CREATE TABLE user_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    status task_status DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, task_id)
);

-- Orders table (product purchases)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    total_amount DECIMAL(15, 2) NOT NULL,
    status order_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stocks table (simulated stocks)
CREATE TABLE stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    current_price DECIMAL(15, 2) NOT NULL,
    previous_price DECIMAL(15, 2),
    price_change_percent DECIMAL(5, 2) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User stock portfolio
CREATE TABLE user_stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    average_buy_price DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, stock_id)
);

-- Stock transactions
CREATE TABLE stock_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stock_id UUID REFERENCES stocks(id),
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
    quantity INTEGER NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table (all virtual currency transactions)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    balance_before DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    description TEXT,
    reference_id UUID, -- Reference to order, task, stock transaction, etc.
    reference_type VARCHAR(50), -- 'order', 'task', 'stock', 'admin_grant', etc.
    created_by UUID REFERENCES users(id), -- Admin who granted/revoked coins
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI recommendations table
CREATE TABLE ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL CHECK (recommendation_type IN ('spending', 'investing')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    action_type VARCHAR(50), -- 'product', 'stock', 'task'
    action_id UUID,
    confidence_score DECIMAL(3, 2) DEFAULT 0.5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX idx_user_stocks_user_id ON user_stocks(user_id);
CREATE INDEX idx_stock_transactions_user_id ON stock_transactions(user_id);
CREATE INDEX idx_ai_recommendations_user_id ON ai_recommendations(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON stocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create transaction record
CREATE OR REPLACE FUNCTION create_transaction(
    p_user_id UUID,
    p_type transaction_type,
    p_amount DECIMAL,
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type VARCHAR DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_balance_before DECIMAL(15, 2);
    v_balance_after DECIMAL(15, 2);
    v_transaction_id UUID;
BEGIN
    -- Get current balance
    SELECT virtual_balance INTO v_balance_before FROM users WHERE id = p_user_id;
    
    -- Calculate new balance
    IF p_type IN ('earn', 'grant', 'task_reward', 'stock_profit') THEN
        v_balance_after := v_balance_before + p_amount;
    ELSE
        v_balance_after := v_balance_before - p_amount;
    END IF;
    
    -- Update user balance
    UPDATE users SET virtual_balance = v_balance_after WHERE id = p_user_id;
    
    -- Create transaction record
    INSERT INTO transactions (
        user_id, type, amount, balance_before, balance_after,
        description, reference_id, reference_type, created_by
    ) VALUES (
        p_user_id, p_type, p_amount, v_balance_before, v_balance_after,
        p_description, p_reference_id, p_reference_type, p_created_by
    ) RETURNING id INTO v_transaction_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default admin user
-- NOTE: You need to create the admin user manually after running migrations
-- Use the script: backend/scripts/create-admin.js
-- Or create via the registration endpoint and then update role to 'admin' in database
-- Example SQL (replace password_hash with actual bcrypt hash):
-- INSERT INTO users (email, password_hash, full_name, role, virtual_balance)
-- VALUES (
--     'admin@HMall.com',
--     '$2b$10$YOUR_BCRYPT_HASH_HERE',
--     'Admin User',
--     'admin',
--     100000.00
-- );

-- Insert sample products
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
    ('Course', 'Online course for skill development', 250.00, 'Education', 300, 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&h=500&fit=crop', true);

-- Insert sample tasks
INSERT INTO tasks (title, description, reward_amount, is_active)
VALUES
    ('Complete Profile', 'Fill out your complete profile information', 50.00, true),
    ('First Purchase', 'Make your first product purchase', 100.00, true),
    ('Daily Login', 'Login to the app today', 10.00, true),
    ('Stock Trader', 'Make your first stock purchase', 150.00, true),
    ('Task Master', 'Complete 5 tasks', 200.00, true);

-- Insert sample stocks
INSERT INTO stocks (symbol, name, current_price, previous_price, price_change_percent, description, is_active)
VALUES
    ('VTECH', 'Tech Corp', 100.00, 95.00, 5.26, 'Leading virtual technology company', true),
    ('VECO', 'E-commerce Inc', 75.50, 80.00, -5.63, 'Virtual marketplace platform', true),
    ('VFIN', 'Finance Group', 120.00, 115.00, 4.35, 'Virtual financial services', true),
    ('VGAME', 'Games Studio', 45.00, 50.00, -10.00, 'Virtual gaming entertainment', true),
    ('VEDU', 'Education Co', 60.00, 58.00, 3.45, 'Virtual learning platform', true);


