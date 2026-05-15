-- Transaction labels table
CREATE TABLE IF NOT EXISTS transaction_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL, -- e.g., 'groceries', 'entertainment', 'bills', 'electronics'
    label_source VARCHAR(20) NOT NULL DEFAULT 'auto' CHECK (label_source IN ('auto', 'manual')),
    confidence_score DECIMAL(3, 2) DEFAULT 0.5, -- 0.0 to 1.0, only for auto labels
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(transaction_id) -- One label per transaction
);

-- Shopping cart table
CREATE TABLE IF NOT EXISTS shopping_cart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id) -- One entry per product per user
);

-- Purchase history view (combines orders with product and transaction info)
-- Drop existing view first to allow column name changes
DROP VIEW IF EXISTS purchase_history;

CREATE VIEW purchase_history AS
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_labels_transaction_id ON transaction_labels(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_labels_user_id ON transaction_labels(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_labels_label ON transaction_labels(label);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_user_id ON shopping_cart(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_product_id ON shopping_cart(product_id);

-- Function to automatically label a transaction
CREATE OR REPLACE FUNCTION auto_label_transaction(p_transaction_id UUID)
RETURNS VOID AS $$
DECLARE
    v_transaction RECORD;
    v_product RECORD;
    v_label VARCHAR(100);
    v_confidence DECIMAL(3, 2);
BEGIN
    -- Get transaction details
    SELECT * INTO v_transaction
    FROM transactions
    WHERE id = p_transaction_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Only label 'spend' type transactions
    IF v_transaction.type != 'spend' THEN
        RETURN;
    END IF;

    -- Check if label already exists
    IF EXISTS (SELECT 1 FROM transaction_labels WHERE transaction_id = p_transaction_id) THEN
        RETURN;
    END IF;

    -- Try to get product info if this is an order transaction
    IF v_transaction.reference_type = 'order' AND v_transaction.reference_id IS NOT NULL THEN
        SELECT p.category INTO v_product
        FROM products p
        JOIN orders o ON o.product_id = p.id
        WHERE o.id = v_transaction.reference_id;

        IF FOUND AND v_product.category IS NOT NULL THEN
            -- Use product category as label
            v_label := LOWER(v_product.category);
            v_confidence := 0.9;
        END IF;
    END IF;

    -- If no label found, use description-based labeling
    IF v_label IS NULL AND v_transaction.description IS NOT NULL THEN
        -- Simple keyword-based categorization
        v_label := CASE
            WHEN LOWER(v_transaction.description) LIKE '%laptop%' OR 
                 LOWER(v_transaction.description) LIKE '%phone%' OR
                 LOWER(v_transaction.description) LIKE '%headphone%' OR
                 LOWER(v_transaction.description) LIKE '%electronic%' THEN 'electronics'
            WHEN LOWER(v_transaction.description) LIKE '%book%' OR
                 LOWER(v_transaction.description) LIKE '%course%' OR
                 LOWER(v_transaction.description) LIKE '%education%' THEN 'education'
            WHEN LOWER(v_transaction.description) LIKE '%food%' OR
                 LOWER(v_transaction.description) LIKE '%grocery%' OR
                 LOWER(v_transaction.description) LIKE '%restaurant%' THEN 'groceries'
            WHEN LOWER(v_transaction.description) LIKE '%game%' OR
                 LOWER(v_transaction.description) LIKE '%entertainment%' OR
                 LOWER(v_transaction.description) LIKE '%movie%' THEN 'entertainment'
            WHEN LOWER(v_transaction.description) LIKE '%bill%' OR
                 LOWER(v_transaction.description) LIKE '%utility%' OR
                 LOWER(v_transaction.description) LIKE '%subscription%' THEN 'bills'
            WHEN LOWER(v_transaction.description) LIKE '%stock%' OR
                 LOWER(v_transaction.description) LIKE '%share%' OR
                 LOWER(v_transaction.description) LIKE '%investment%' THEN 'investment'
            ELSE 'other'
        END;
        v_confidence := 0.6;
    END IF;

    -- Default label if still not found
    IF v_label IS NULL THEN
        v_label := 'other';
        v_confidence := 0.3;
    END IF;

    -- Insert label
    INSERT INTO transaction_labels (transaction_id, user_id, label, label_source, confidence_score)
    VALUES (p_transaction_id, v_transaction.user_id, v_label, 'auto', v_confidence)
    ON CONFLICT (transaction_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-label transactions after creation
CREATE OR REPLACE FUNCTION trigger_auto_label_transaction()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM auto_label_transaction(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_label_transaction_trigger
AFTER INSERT ON transactions
FOR EACH ROW
WHEN (NEW.type = 'spend')
EXECUTE FUNCTION trigger_auto_label_transaction();

-- Update existing transactions with labels
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN SELECT id FROM transactions WHERE type = 'spend' AND id NOT IN (SELECT transaction_id FROM transaction_labels WHERE transaction_id IS NOT NULL)
    LOOP
        PERFORM auto_label_transaction(t.id);
    END LOOP;
END $$;















