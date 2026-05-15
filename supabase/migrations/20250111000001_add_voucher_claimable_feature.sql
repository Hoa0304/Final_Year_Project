-- Add is_claimable field to vouchers table
-- This field determines if users can claim the voucher themselves
-- If true, users can claim the voucher from available vouchers list
-- If false, voucher must be issued directly to users by Admin/Vendor

ALTER TABLE vouchers
ADD COLUMN IF NOT EXISTS is_claimable BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN vouchers.is_claimable IS 'If true, users can claim this voucher themselves. If false, voucher must be issued directly by Admin/Vendor.';

-- Update can_redeem_voucher function to handle claimable vouchers
-- If voucher is claimable and not issued to user, user must claim it first
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
    
    -- Check if voucher requires issuance
    -- If voucher is NOT claimable, it must be issued to the user
    -- If voucher is claimable, check if it has been issued (if issuances exist, user must have one)
    IF NOT v_voucher.is_claimable THEN
        -- Non-claimable voucher: must be issued to user
        SELECT * INTO v_issued_voucher
        FROM voucher_user_issuances
        WHERE voucher_id = p_voucher_id
          AND user_id = p_user_id
          AND is_active = true
          AND (expires_at IS NULL OR expires_at > NOW());
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'can_redeem', false,
                'error', 'This voucher has not been issued to you'
            );
        END IF;
    ELSE
        -- Claimable voucher: check if it has been issued (if issuances exist, user must have one)
        -- But if no issuances exist, anyone can redeem
        IF EXISTS (
            SELECT 1 FROM voucher_user_issuances WHERE voucher_id = p_voucher_id
        ) THEN
            SELECT * INTO v_issued_voucher
            FROM voucher_user_issuances
            WHERE voucher_id = p_voucher_id
              AND user_id = p_user_id
              AND is_active = true
              AND (expires_at IS NULL OR expires_at > NOW());
            
            IF NOT FOUND THEN
                RETURN jsonb_build_object(
                    'can_redeem', false,
                    'error', 'This voucher has not been issued to you'
                );
            END IF;
        END IF;
    END IF;
    
    -- All checks passed
    RETURN jsonb_build_object(
        'can_redeem', true,
        'voucher', row_to_json(v_voucher)
    );
END;
$$ LANGUAGE plpgsql;

















