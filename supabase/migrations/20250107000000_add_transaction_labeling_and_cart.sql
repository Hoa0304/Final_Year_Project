-- Add category and manual label flag to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS category VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_manual_label BOOLEAN DEFAULT false;

-- Create transaction_labels table (separate from transactions for flexibility)
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

-- Create transaction label feedback table for AI learning
CREATE TABLE IF NOT EXISTS transaction_label_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    original_category VARCHAR(50),
    corrected_category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(transaction_id, user_id)
);

-- Create shopping cart table
CREATE TABLE IF NOT EXISTS shopping_cart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Purchase history view will be created in next migration (20250107000001)
-- with more complete structure including transaction info

-- Create index for transaction categories
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_transaction_labels_transaction_id ON transaction_labels(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_labels_user_id ON transaction_labels(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_labels_label ON transaction_labels(label);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_user_id ON shopping_cart(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_label_feedback_user_id ON transaction_label_feedback(user_id);

-- Function to automatically categorize transactions based on reference_type and description
CREATE OR REPLACE FUNCTION auto_categorize_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Only categorize if category is not set and not manually labeled
    IF NEW.category IS NULL AND NOT NEW.is_manual_label THEN
        -- Categorize based on reference_type
        CASE NEW.reference_type
            WHEN 'order' THEN
                -- Get product category from order
                SELECT p.category INTO NEW.category
                FROM orders o
                JOIN products p ON o.product_id = p.id
                WHERE o.id = NEW.reference_id
                LIMIT 1;
                
                -- If product category exists, use it; otherwise use generic category
                IF NEW.category IS NULL THEN
                    NEW.category := 'Shopping';
                END IF;
            WHEN 'task' THEN
                NEW.category := 'Earnings';
            WHEN 'stock' THEN
                IF NEW.type = 'stock_profit' THEN
                    NEW.category := 'Investment';
                ELSIF NEW.type = 'stock_loss' THEN
                    NEW.category := 'Investment';
                ELSE
                    NEW.category := 'Investment';
                END IF;
            WHEN 'admin_grant' THEN
                NEW.category := 'Reward';
            WHEN 'admin_revoke' THEN
                NEW.category := 'Adjustment';
            ELSE
                -- Try to infer from description
                IF NEW.description ILIKE '%game%' OR NEW.description ILIKE '%play%' THEN
                    NEW.category := 'Entertainment';
                ELSIF NEW.description ILIKE '%product%' OR NEW.description ILIKE '%purchase%' THEN
                    NEW.category := 'Shopping';
                ELSIF NEW.description ILIKE '%task%' OR NEW.description ILIKE '%reward%' THEN
                    NEW.category := 'Earnings';
                ELSIF NEW.description ILIKE '%stock%' OR NEW.description ILIKE '%investment%' THEN
                    NEW.category := 'Investment';
                ELSE
                    -- Default categories based on transaction type
                    CASE NEW.type
                        WHEN 'spend' THEN NEW.category := 'Shopping';
                        WHEN 'earn' THEN NEW.category := 'Earnings';
                        WHEN 'task_reward' THEN NEW.category := 'Earnings';
                        WHEN 'stock_profit' THEN NEW.category := 'Investment';
                        WHEN 'stock_loss' THEN NEW.category := 'Investment';
                        ELSE NEW.category := 'Other';
                    END CASE;
                END IF;
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-categorize transactions
DROP TRIGGER IF EXISTS trigger_auto_categorize_transaction ON transactions;
CREATE TRIGGER trigger_auto_categorize_transaction
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION auto_categorize_transaction();

-- Update existing transactions with categories
UPDATE transactions
SET category = CASE
    WHEN reference_type = 'order' THEN 'Shopping'
    WHEN reference_type = 'task' THEN 'Earnings'
    WHEN reference_type = 'stock' THEN 'Investment'
    WHEN reference_type = 'admin_grant' THEN 'Reward'
    WHEN type = 'spend' THEN 'Shopping'
    WHEN type IN ('earn', 'task_reward') THEN 'Earnings'
    WHEN type IN ('stock_profit', 'stock_loss') THEN 'Investment'
    ELSE 'Other'
END
WHERE category IS NULL;

-- Create labels for existing transactions
INSERT INTO transaction_labels (transaction_id, user_id, label, label_source, confidence_score)
SELECT 
    t.id,
    t.user_id,
    t.category,
    'auto',
    0.7
FROM transactions t
WHERE t.category IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM transaction_labels tl WHERE tl.transaction_id = t.id
);

-- Function to create transaction label after transaction is created
CREATE OR REPLACE FUNCTION create_transaction_label()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create label for spend transactions
    IF NEW.type = 'spend' AND NEW.category IS NOT NULL THEN
        INSERT INTO transaction_labels (transaction_id, user_id, label, label_source, confidence_score)
        VALUES (NEW.id, NEW.user_id, NEW.category, 'auto', 0.7)
        ON CONFLICT (transaction_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create labels
DROP TRIGGER IF EXISTS trigger_create_transaction_label ON transactions;
CREATE TRIGGER trigger_create_transaction_label
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION create_transaction_label();

