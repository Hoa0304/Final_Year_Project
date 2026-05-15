-- Voucher System Migration
-- Creates tables for vouchers, voucher redemptions, and voucher user issuances

-- Create enum for voucher discount types
CREATE TYPE voucher_discount_type AS ENUM ('percentage', 'fixed_amount', 'coin_bonus');

-- Create enum for voucher status
CREATE TYPE voucher_status AS ENUM ('active', 'inactive', 'expired');

-- Vouchers table
-- Stores all vouchers created by Admin or Vendors
CREATE TABLE vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- Unique voucher code
    title VARCHAR(255) NOT NULL, -- Voucher title/name
    description TEXT, -- Voucher description
    
    -- Discount configuration
    discount_type voucher_discount_type NOT NULL, -- Type of discount: percentage, fixed_amount, coin_bonus
    discount_value DECIMAL(15, 2) NOT NULL, -- Discount value (percentage 0-100, or fixed amount, or coin bonus amount)
    
    -- Usage limits
    usage_limit_per_user INTEGER DEFAULT NULL, -- Max times a single user can use this voucher (NULL = unlimited)
    total_usage_limit INTEGER DEFAULT NULL, -- Max total times voucher can be used (NULL = unlimited)
    current_usage_count INTEGER DEFAULT 0, -- Current total usage count
    
    -- Validity period
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When voucher becomes valid
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- When voucher expires
    
    -- Status and metadata
    status voucher_status DEFAULT 'active', -- Voucher status
    is_active BOOLEAN DEFAULT true, -- Whether voucher is active (can be deactivated without deleting)
    
    -- Creator information
    created_by UUID REFERENCES users(id), -- Admin or Vendor who created the voucher
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_discount_value CHECK (
        (discount_type = 'percentage' AND discount_value >= 0 AND discount_value <= 100) OR
        (discount_type IN ('fixed_amount', 'coin_bonus') AND discount_value > 0)
    ),
    CONSTRAINT check_usage_limits CHECK (
        (usage_limit_per_user IS NULL OR usage_limit_per_user > 0) AND
        (total_usage_limit IS NULL OR total_usage_limit > 0)
    ),
    CONSTRAINT check_validity_period CHECK (expires_at > valid_from)
);

-- Voucher user issuances table
-- Tracks vouchers that have been issued directly to specific users by Admin
CREATE TABLE voucher_user_issuances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID REFERENCES vouchers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    issued_by UUID REFERENCES users(id), -- Admin who issued the voucher
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional: can override voucher's expiry date
    
    -- Status
    is_active BOOLEAN DEFAULT true, -- Whether this issuance is still valid
    
    -- Constraints
    UNIQUE(voucher_id, user_id), -- A user can only have one issuance of a specific voucher
    CONSTRAINT check_issuance_expiry CHECK (expires_at IS NULL OR expires_at > issued_at)
);

-- Voucher redemptions table
-- Tracks all voucher redemptions for auditing and analytics
CREATE TABLE voucher_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Redemption details
    discount_type voucher_discount_type NOT NULL, -- Snapshot of discount type at redemption time
    discount_value DECIMAL(15, 2) NOT NULL, -- Snapshot of discount value at redemption time
    discount_amount DECIMAL(15, 2) NOT NULL, -- Actual discount amount applied
    original_amount DECIMAL(15, 2) NOT NULL, -- Original amount before discount
    final_amount DECIMAL(15, 2) NOT NULL, -- Final amount after discount
    
    -- Reference to transaction/order where voucher was used
    reference_id UUID, -- Reference to order, transaction, etc.
    reference_type VARCHAR(50), -- 'order', 'coin_topup', etc.
    
    -- Metadata
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_redemption_amounts CHECK (
        discount_amount >= 0 AND
        final_amount >= 0 AND
        final_amount <= original_amount
    )
);

-- Indexes for performance
CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_status ON vouchers(status);
CREATE INDEX idx_vouchers_created_by ON vouchers(created_by);
CREATE INDEX idx_vouchers_expires_at ON vouchers(expires_at);
CREATE INDEX idx_vouchers_is_active ON vouchers(is_active);

CREATE INDEX idx_voucher_user_issuances_voucher_id ON voucher_user_issuances(voucher_id);
CREATE INDEX idx_voucher_user_issuances_user_id ON voucher_user_issuances(user_id);
CREATE INDEX idx_voucher_user_issuances_is_active ON voucher_user_issuances(is_active);

CREATE INDEX idx_voucher_redemptions_voucher_id ON voucher_redemptions(voucher_id);
CREATE INDEX idx_voucher_redemptions_user_id ON voucher_redemptions(user_id);
CREATE INDEX idx_voucher_redemptions_redeemed_at ON voucher_redemptions(redeemed_at);
CREATE INDEX idx_voucher_redemptions_reference ON voucher_redemptions(reference_id, reference_type);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON vouchers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update voucher status based on expiry
CREATE OR REPLACE FUNCTION update_voucher_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update status to 'expired' if expires_at has passed
    IF NEW.expires_at < NOW() AND NEW.status = 'active' THEN
        NEW.status = 'expired';
        NEW.is_active = false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check and update voucher status on insert/update
CREATE TRIGGER check_voucher_expiry BEFORE INSERT OR UPDATE ON vouchers
    FOR EACH ROW EXECUTE FUNCTION update_voucher_status();

-- Function to validate voucher redemption (called from application logic)
-- This function checks if a voucher can be redeemed by a user
CREATE OR REPLACE FUNCTION can_redeem_voucher(
    p_voucher_id UUID,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_voucher RECORD;
    v_user_usage_count INTEGER;
    v_total_usage_count INTEGER;
    v_issued_voucher RECORD;
    v_result JSONB;
BEGIN
    -- Get voucher details
    SELECT * INTO v_voucher
    FROM vouchers
    WHERE id = p_voucher_id;
    
    -- Check if voucher exists
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'can_redeem', false,
            'error', 'Voucher not found'
        );
    END IF;
    
    -- Check if voucher is active
    IF NOT v_voucher.is_active OR v_voucher.status != 'active' THEN
        RETURN jsonb_build_object(
            'can_redeem', false,
            'error', 'Voucher is not active'
        );
    END IF;
    
    -- Check if voucher has expired
    IF v_voucher.expires_at < NOW() THEN
        RETURN jsonb_build_object(
            'can_redeem', false,
            'error', 'Voucher has expired'
        );
    END IF;
    
    -- Check if voucher is valid from date
    IF v_voucher.valid_from > NOW() THEN
        RETURN jsonb_build_object(
            'can_redeem', false,
            'error', 'Voucher is not yet valid'
        );
    END IF;
    
    -- Check total usage limit
    IF v_voucher.total_usage_limit IS NOT NULL THEN
        v_total_usage_count := v_voucher.current_usage_count;
        IF v_total_usage_count >= v_voucher.total_usage_limit THEN
            RETURN jsonb_build_object(
                'can_redeem', false,
                'error', 'Voucher usage limit has been reached'
            );
        END IF;
    END IF;
    
    -- Check per-user usage limit
    IF v_voucher.usage_limit_per_user IS NOT NULL THEN
        SELECT COUNT(*) INTO v_user_usage_count
        FROM voucher_redemptions
        WHERE voucher_id = p_voucher_id AND user_id = p_user_id;
        
        IF v_user_usage_count >= v_voucher.usage_limit_per_user THEN
            RETURN jsonb_build_object(
                'can_redeem', false,
                'error', 'You have reached the usage limit for this voucher'
            );
        END IF;
    END IF;
    
    -- Check if voucher was issued to this specific user (if applicable)
    -- If voucher has user issuances, user must be in the issuance list
    SELECT * INTO v_issued_voucher
    FROM voucher_user_issuances
    WHERE voucher_id = p_voucher_id
      AND user_id = p_user_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW());
    
    -- If there are any user issuances for this voucher, user must have one
    IF EXISTS (
        SELECT 1 FROM voucher_user_issuances WHERE voucher_id = p_voucher_id
    ) AND NOT FOUND THEN
        RETURN jsonb_build_object(
            'can_redeem', false,
            'error', 'This voucher has not been issued to you'
        );
    END IF;
    
    -- All checks passed
    RETURN jsonb_build_object(
        'can_redeem', true,
        'voucher', row_to_json(v_voucher)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to atomically increment voucher usage count
-- This ensures concurrency safety when multiple users redeem the same voucher
CREATE OR REPLACE FUNCTION increment_voucher_usage(
    p_voucher_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_current_count INTEGER;
    v_total_limit INTEGER;
BEGIN
    -- Get current usage count and total limit
    SELECT current_usage_count, total_usage_limit
    INTO v_current_count, v_total_limit
    FROM vouchers
    WHERE id = p_voucher_id
    FOR UPDATE; -- Lock row for update to prevent race conditions
    
    -- Check if limit has been reached
    IF v_total_limit IS NOT NULL AND v_current_count >= v_total_limit THEN
        RAISE EXCEPTION 'Voucher usage limit has been reached';
    END IF;
    
    -- Increment usage count
    UPDATE vouchers
    SET current_usage_count = current_usage_count + 1
    WHERE id = p_voucher_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE vouchers IS 'Stores all vouchers created by Admin or Vendors';
COMMENT ON TABLE voucher_user_issuances IS 'Tracks vouchers issued directly to specific users by Admin';
COMMENT ON TABLE voucher_redemptions IS 'Tracks all voucher redemptions for auditing and analytics';
COMMENT ON FUNCTION can_redeem_voucher IS 'Validates if a user can redeem a specific voucher';
COMMENT ON FUNCTION increment_voucher_usage IS 'Atomically increments voucher usage count with concurrency safety';

