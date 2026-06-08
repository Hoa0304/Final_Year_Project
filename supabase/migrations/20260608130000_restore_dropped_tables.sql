
-- Restore all dropped tables that are still used by the backend

-- 1. Product Ratings Table (from 20250106000000_add_product_ratings.sql)
CREATE TABLE IF NOT EXISTS product_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Indexes for product_ratings
CREATE INDEX IF NOT EXISTS idx_product_ratings_product_id ON product_ratings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_user_id ON product_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_created_at ON product_ratings(created_at);

-- Trigger for product_ratings updated_at
DO $$ BEGIN
    CREATE TRIGGER update_product_ratings_updated_at
        BEFORE UPDATE ON product_ratings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 2. Shopping Cart Table (from 20250107000001_add_transaction_labels_and_cart.sql)
CREATE TABLE IF NOT EXISTS shopping_cart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_shopping_cart_user_id ON shopping_cart(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_product_id ON shopping_cart(product_id);


-- 3. Chat System Tables (from 20250113000000_add_chat_system.sql)
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_at ON chat_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- RLS for chat tables
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view their own conversations" ON chat_conversations
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create their own conversations" ON chat_conversations
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update their own conversations" ON chat_conversations
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete their own conversations" ON chat_conversations
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can view messages in their conversations" ON chat_messages
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM chat_conversations 
                WHERE chat_conversations.id = chat_messages.conversation_id 
                AND chat_conversations.user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create messages in their conversations" ON chat_messages
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM chat_conversations 
                WHERE chat_conversations.id = chat_messages.conversation_id 
                AND chat_conversations.user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 4. Social Discussion Tables (from 20250114000000_add_social_discussion_system.sql)
CREATE TABLE IF NOT EXISTS discussion_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_urls TEXT[],
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discussion_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID REFERENCES discussion_threads(id) ON DELETE CASCADE NOT NULL,
    parent_post_id UUID REFERENCES discussion_posts(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    image_urls TEXT[],
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES discussion_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reaction_type VARCHAR(20) DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'helpful', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS thread_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID REFERENCES discussion_threads(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reaction_type VARCHAR(20) DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'helpful', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS content_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reported_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('thread', 'post')),
    content_id UUID NOT NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for social tables
CREATE INDEX IF NOT EXISTS idx_discussion_threads_product_id ON discussion_threads(product_id);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_created_by ON discussion_threads(created_by);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_created_at ON discussion_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_is_pinned ON discussion_threads(is_pinned);

CREATE INDEX IF NOT EXISTS idx_discussion_posts_thread_id ON discussion_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_discussion_posts_parent_post_id ON discussion_posts(parent_post_id);
CREATE INDEX IF NOT EXISTS idx_discussion_posts_created_by ON discussion_posts(created_by);
CREATE INDEX IF NOT EXISTS idx_discussion_posts_created_at ON discussion_posts(created_at);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON post_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_thread_reactions_thread_id ON thread_reactions(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_reactions_user_id ON thread_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_content_reports_content ON content_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);

-- Function to update updated_at for discussion tables
CREATE OR REPLACE FUNCTION update_discussion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for social tables
DO $$ BEGIN
    CREATE TRIGGER update_discussion_threads_updated_at
        BEFORE UPDATE ON discussion_threads
        FOR EACH ROW
        EXECUTE FUNCTION update_discussion_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_discussion_posts_updated_at
        BEFORE UPDATE ON discussion_posts
        FOR EACH ROW
        EXECUTE FUNCTION update_discussion_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- RLS for social tables
ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Anyone can view active threads" ON discussion_threads
        FOR SELECT USING (is_deleted = false);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create threads" ON discussion_threads
        FOR INSERT WITH CHECK (auth.uid() = created_by);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update their own threads" ON discussion_threads
        FOR UPDATE USING (auth.uid() = created_by);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete their own threads" ON discussion_threads
        FOR UPDATE USING (auth.uid() = created_by);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Anyone can view active posts" ON discussion_posts
        FOR SELECT USING (is_deleted = false);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create posts" ON discussion_posts
        FOR INSERT WITH CHECK (auth.uid() = created_by);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update their own posts" ON discussion_posts
        FOR UPDATE USING (auth.uid() = created_by);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete their own posts" ON discussion_posts
        FOR UPDATE USING (auth.uid() = created_by);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Anyone can view reactions" ON post_reactions
        FOR SELECT USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can manage their own reactions" ON post_reactions
        FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Anyone can view thread reactions" ON thread_reactions
        FOR SELECT USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can manage their own thread reactions" ON thread_reactions
        FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can view their own reports" ON content_reports
        FOR SELECT USING (auth.uid() = reported_by);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create reports" ON content_reports
        FOR INSERT WITH CHECK (auth.uid() = reported_by);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 5. Notification System Tables (from 20250109000000_add_notification_system.sql)
-- Create enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'order_placed',
        'order_completed',
        'order_cancelled',
        'task_completed',
        'task_reward_claimed',
        'stock_price_alert',
        'balance_low',
        'balance_high',
        'product_discount',
        'new_product',
        'system_announcement',
        'game_completed',
        'game_reward',
        'rating_received',
        'cart_reminder',
        'social_reply',
        'product_review'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM ('in_app', 'push', 'email', 'sms');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed', 'blocked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    priority notification_priority DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    channels notification_channel[] DEFAULT ARRAY['in_app']::notification_channel[],
    scheduled_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    enabled BOOLEAN DEFAULT true,
    channels notification_channel[] DEFAULT ARRAY['in_app']::notification_channel[],
    min_priority notification_priority DEFAULT 'low',
    max_per_day INTEGER DEFAULT 10,
    cooldown_minutes INTEGER DEFAULT 0,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

-- Notification history
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL,
    status notification_status DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification frequency tracking
CREATE TABLE IF NOT EXISTS notification_frequency_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    last_sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    count_today INTEGER DEFAULT 1,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_type, date)
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_type ON user_notification_preferences(notification_type);

CREATE INDEX IF NOT EXISTS idx_notification_history_notification_id ON notification_history(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);
CREATE INDEX IF NOT EXISTS idx_notification_history_channel ON notification_history(channel);

CREATE INDEX IF NOT EXISTS idx_notification_frequency_user_type ON notification_frequency_tracking(user_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_frequency_date ON notification_frequency_tracking(date);

-- Triggers for notifications
DO $$ BEGIN
    CREATE TRIGGER update_notifications_updated_at
        BEFORE UPDATE ON notifications
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_user_notification_preferences_updated_at
        BEFORE UPDATE ON user_notification_preferences
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_notification_history_updated_at
        BEFORE UPDATE ON notification_history
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_notification_frequency_tracking_updated_at
        BEFORE UPDATE ON notification_frequency_tracking
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Functions for notifications
CREATE OR REPLACE FUNCTION can_send_notification(
    p_user_id UUID,
    p_notification_type notification_type,
    p_cooldown_minutes INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
    v_preference RECORD;
    v_frequency RECORD;
    v_count_today INTEGER;
    v_last_sent_at TIMESTAMP WITH TIME ZONE;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_current_time TIME := CURRENT_TIME;
BEGIN
    -- Get user preference
    SELECT * INTO v_preference
    FROM user_notification_preferences
    WHERE user_id = p_user_id AND notification_type = p_notification_type;

    -- If no preference exists, use defaults (enabled, no limits)
    IF NOT FOUND THEN
        -- Check if user is active (not deleted)
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
            RETURN FALSE;
        END IF;
        RETURN TRUE;
    END IF;

    -- Check if notification type is disabled
    IF NOT v_preference.enabled THEN
        RETURN FALSE;
    END IF;

    -- Check quiet hours
    IF v_preference.quiet_hours_start IS NOT NULL AND v_preference.quiet_hours_end IS NOT NULL THEN
        IF v_preference.quiet_hours_start > v_preference.quiet_hours_end THEN
            -- Quiet hours span midnight
            IF v_current_time >= v_preference.quiet_hours_start OR v_current_time <= v_preference.quiet_hours_end THEN
                RETURN FALSE;
            END IF;
        ELSE
            -- Normal quiet hours
            IF v_current_time >= v_preference.quiet_hours_start AND v_current_time <= v_preference.quiet_hours_end THEN
                RETURN FALSE;
            END IF;
        END IF;
    END IF;

    -- Get frequency tracking
    SELECT * INTO v_frequency
    FROM notification_frequency_tracking
    WHERE user_id = p_user_id 
        AND notification_type = p_notification_type 
        AND date = CURRENT_DATE;

    -- Check daily limit
    IF FOUND THEN
        v_count_today := v_frequency.count_today;
        v_last_sent_at := v_frequency.last_sent_at;

        -- Check daily limit
        IF v_count_today >= v_preference.max_per_day THEN
            RETURN FALSE;
        END IF;

        -- Check cooldown period
        IF p_cooldown_minutes > 0 OR v_preference.cooldown_minutes > 0 THEN
            DECLARE
                v_cooldown_minutes INTEGER := GREATEST(p_cooldown_minutes, v_preference.cooldown_minutes);
                v_cooldown_interval INTERVAL := (v_cooldown_minutes || ' minutes')::INTERVAL;
            BEGIN
                IF v_last_sent_at IS NOT NULL AND (v_now - v_last_sent_at) < v_cooldown_interval THEN
                    RETURN FALSE;
                END IF;
            END;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION record_notification_sent(
    p_user_id UUID,
    p_notification_type notification_type
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO notification_frequency_tracking (user_id, notification_type, last_sent_at, count_today, date)
    VALUES (p_user_id, p_notification_type, NOW(), 1, CURRENT_DATE)
    ON CONFLICT (user_id, notification_type, date)
    DO UPDATE SET
        count_today = notification_frequency_tracking.count_today + 1,
        last_sent_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;


-- 6. Enterprise Expansion Tables (from 20260507000000_enterprise_expansion.sql)
-- Create necessary enum types first
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('vnpay', 'momo', 'zalopay', 'coin', 'bank_transfer');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'canceled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'hidden');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Coin Packages
CREATE TABLE IF NOT EXISTS coin_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    coins DECIMAL(15, 2) NOT NULL,
    price_vnd DECIMAL(15, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'VND',
    status payment_status DEFAULT 'pending',
    method payment_method,
    description TEXT,
    reference_id UUID,
    reference_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    external_id VARCHAR(255),
    provider VARCHAR(50),
    raw_response JSONB,
    signature_valid BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Profiles
CREATE TABLE IF NOT EXISTS vendor_profiles (
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

-- Vendor Packages
CREATE TABLE IF NOT EXISTS vendor_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    price_monthly DECIMAL(15, 2) NOT NULL,
    price_yearly DECIMAL(15, 2) NOT NULL,
    product_limit INTEGER DEFAULT 1,
    category_limit INTEGER DEFAULT 1,
    priority_display BOOLEAN DEFAULT false,
    badge_vip BOOLEAN DEFAULT false,
    analytics_enabled BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Subscriptions
CREATE TABLE IF NOT EXISTS vendor_subscriptions (
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

-- Product Reviews (Moderation)
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES users(id),
    status product_status NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Moderation Logs
CREATE TABLE IF NOT EXISTS moderation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    target_id UUID,
    target_type VARCHAR(50),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallet Histories
CREATE TABLE IF NOT EXISTS wallet_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    type VARCHAR(20) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    balance_before DECIMAL(15, 2),
    balance_after DECIMAL(15, 2),
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add status to products if missing
ALTER TABLE products ADD COLUMN IF NOT EXISTS status product_status DEFAULT 'approved';

-- Triggers for updated_at
DO $$ BEGIN
    CREATE TRIGGER update_coin_packages_updated_at BEFORE UPDATE ON coin_packages
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_vendor_profiles_updated_at BEFORE UPDATE ON vendor_profiles
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_vendor_subscriptions_updated_at BEFORE UPDATE ON vendor_subscriptions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Seed Default Coin Packages
INSERT INTO coin_packages (name, coins, price_vnd, description) VALUES
('Starter Pack', 100, 100000, '100 coins for basic features'),
('Pro Pack', 500, 450000, '500 coins (10% discount)'),
('Whale Pack', 1200, 1000000, '1200 coins (20% discount)')
ON CONFLICT DO NOTHING;

-- Seed Default Vendor Packages
INSERT INTO vendor_packages (name, price_monthly, price_yearly, product_limit, category_limit, priority_display, badge_vip, analytics_enabled) VALUES
('Free Tier', 0, 0, 1, 1, false, false, false),
('VIP Monthly', 200000, 2000000, -1, 5, true, true, true)
ON CONFLICT DO NOTHING;


-- 7. Product Discounts Tables (from 20250108000000_add_product_discounts.sql)
CREATE TABLE IF NOT EXISTS product_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    discount_percent DECIMAL(5, 2) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_discounts_product_id ON product_discounts(product_id);

DO $$ BEGIN
    CREATE TRIGGER update_product_discounts_updated_at BEFORE UPDATE ON product_discounts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- 8. Transaction Labels (from 20250107000001_add_transaction_labels_and_cart.sql)
CREATE TABLE IF NOT EXISTS transaction_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    label_source VARCHAR(20) NOT NULL DEFAULT 'auto' CHECK (label_source IN ('auto', 'manual')),
    confidence_score DECIMAL(3, 2) DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_transaction_labels_transaction_id ON transaction_labels(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_labels_user_id ON transaction_labels(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_labels_label ON transaction_labels(label);


-- 9. Re-create Purchase History View
CREATE OR REPLACE VIEW purchase_history AS
SELECT 
    o.id AS order_id,
    o.user_id,
    o.product_id,
    o.quantity,
    o.total_amount,
    o.status,
    o.created_at AS purchased_at,
    p.name AS product_name,
    p.image_url AS product_image,
    p.category AS product_category,
    p.price AS product_price_at_purchase,
    t.id AS transaction_id,
    t.description AS transaction_description,
    tl.label AS transaction_label
FROM orders o
LEFT JOIN products p ON o.product_id = p.id
LEFT JOIN transactions t ON t.reference_id = o.id AND t.reference_type = 'order'
LEFT JOIN transaction_labels tl ON tl.transaction_id = t.id
WHERE o.status = 'completed'
ORDER BY o.created_at DESC;

