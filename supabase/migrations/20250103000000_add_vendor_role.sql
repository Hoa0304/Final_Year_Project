-- Add vendor role to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'vendor';

-- Add comment to explain vendor role
COMMENT ON TYPE user_role IS 'User roles: user (regular user), admin (system administrator), vendor (marketplace vendor who can create products)';

