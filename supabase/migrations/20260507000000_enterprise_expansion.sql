-- HMall Enterprise Expansion Migration
-- Date: 2026-05-07

-- 1. Update Roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin_vendor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin_client';
-- Map 'user' to 'client' conceptually in code, but keep 'user' in DB for compatibility if needed
-- Or we can add 'client' and migrate later. For now, let's add 'client' as well.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client';

-- 2. Payment System Tables
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('vnpay', 'momo', 'zalopay', 'coin', 'bank_transfer');

CREATE TABLE coin_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    coins DECIMAL(15, 2) NOT NULL,
    price_vnd DECIMAL(15, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'VND', -- VND or COIN
    status payment_status DEFAULT 'pending',
    method payment_method,
    description TEXT,
    reference_id UUID, -- ID of package, product, etc.
    reference_type VARCHAR(50), -- 'coin_package', 'product_order', 'vendor_vip'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    external_id VARCHAR(255), -- Gateway Transaction ID
    provider VARCHAR(50), -- vnpay, momo
    raw_response JSONB,
    signature_valid BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Vendor & Subscription Tables
CREATE TABLE vendor_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    business_name VARCHAR(255),
    description TEXT,
    logo_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT false,
    balance DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE vendor_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    price_monthly DECIMAL(15, 2) NOT NULL,
    price_yearly DECIMAL(15, 2) NOT NULL,
    product_limit INTEGER DEFAULT 1, -- -1 for unlimited
    category_limit INTEGER DEFAULT 1,
    priority_display BOOLEAN DEFAULT false,
    badge_vip BOOLEAN DEFAULT false,
    analytics_enabled BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'canceled');

CREATE TABLE vendor_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    package_id UUID REFERENCES vendor_packages(id),
    status subscription_status DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Product Moderation
CREATE TYPE product_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'hidden');

-- Add status to products (handling existing products)
ALTER TABLE products ADD COLUMN IF NOT EXISTS status product_status DEFAULT 'approved';
-- Existing products are already active, so they should be 'approved'

CREATE TABLE product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES users(id), -- AdminVendor who reviewed
    status product_status NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE moderation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL, -- 'approve_product', 'block_vendor', etc.
    target_id UUID,
    target_type VARCHAR(50),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Wallet Histories (Unified log for all coin/vnd movements)
CREATE TABLE wallet_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'deposit', 'withdraw', 'purchase', 'refund'
    currency VARCHAR(10) NOT NULL, -- 'VND', 'COIN'
    balance_before DECIMAL(15, 2),
    balance_after DECIMAL(15, 2),
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers for updated_at
CREATE TRIGGER update_coin_packages_updated_at BEFORE UPDATE ON coin_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_profiles_updated_at BEFORE UPDATE ON vendor_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_subscriptions_updated_at BEFORE UPDATE ON vendor_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed Default Coin Packages
INSERT INTO coin_packages (name, coins, price_vnd, description) VALUES
('Starter Pack', 100, 100000, '100 coins for basic features'),
('Pro Pack', 500, 450000, '500 coins (10% discount)'),
('Whale Pack', 1200, 1000000, '1200 coins (20% discount)');

-- Seed Default Vendor Package (Free tier)
INSERT INTO vendor_packages (name, price_monthly, price_yearly, product_limit, category_limit) VALUES
('Free Tier', 0, 0, 1, 1),
('VIP Monthly', 200000, 2000000, -1, 5);
