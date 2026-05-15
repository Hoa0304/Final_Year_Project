-- Add is_featured field to vouchers table
-- Admin can mark vouchers to show in public voucher page
ALTER TABLE vouchers
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN vouchers.is_featured IS 'If true, this voucher will be shown in the public voucher page. Only admin can set this.';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_vouchers_is_featured ON vouchers(is_featured);

-- Update getAvailableVouchers logic to automatically hide vouchers that are out of stock
-- This is handled in application logic, but we add a helper function for clarity

-- Function to check if voucher is available (not out of stock)
CREATE OR REPLACE FUNCTION is_voucher_available(p_voucher_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_voucher RECORD;
BEGIN
    SELECT * INTO v_voucher
    FROM vouchers
    WHERE id = p_voucher_id;
    
    -- Check if voucher exists
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if voucher is active
    IF NOT v_voucher.is_active OR v_voucher.status != 'active' THEN
        RETURN false;
    END IF;
    
    -- Check if voucher has expired
    IF v_voucher.expires_at < NOW() THEN
        RETURN false;
    END IF;
    
    -- Check if voucher is valid from date
    IF v_voucher.valid_from > NOW() THEN
        RETURN false;
    END IF;
    
    -- Check if voucher is out of stock (total_usage_limit reached)
    IF v_voucher.total_usage_limit IS NOT NULL THEN
        IF v_voucher.current_usage_count >= v_voucher.total_usage_limit THEN
            RETURN false;
        END IF;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_voucher_available IS 'Checks if a voucher is available (not expired, active, and not out of stock)';

















