-- Budget System Migration
-- Adds budget tracking, category budgets, and savings goals

-- User budgets table (overall monthly/weekly budgets)
CREATE TABLE IF NOT EXISTS user_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    budget_type VARCHAR(20) NOT NULL CHECK (budget_type IN ('monthly', 'weekly', 'daily')),
    amount DECIMAL(15, 2) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, budget_type, period_start)
);

-- Category budgets table (budgets for specific categories)
CREATE TABLE IF NOT EXISTS category_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('monthly', 'weekly', 'daily')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category, period_type, period_start)
);

-- Savings goals table
CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_amount DECIMAL(15, 2) NOT NULL,
    current_amount DECIMAL(15, 2) DEFAULT 0,
    target_date DATE,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget alerts table (track when user exceeds budget)
CREATE TABLE IF NOT EXISTS budget_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    budget_id UUID, -- Can be user_budgets or category_budgets
    budget_type VARCHAR(20) NOT NULL CHECK (budget_type IN ('overall', 'category')),
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('warning', 'exceeded')),
    threshold_percentage DECIMAL(5, 2) NOT NULL, -- e.g., 80 for 80%
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_budgets_user_id ON user_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_budgets_period ON user_budgets(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_category_budgets_user_id ON category_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_category_budgets_period ON category_budgets(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_user_id ON budget_alerts(user_id);

-- Function to check and create budget alerts
CREATE OR REPLACE FUNCTION check_budget_alerts()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_amount DECIMAL(15, 2);
    v_budget_type VARCHAR(20);
    v_category VARCHAR(100);
    v_period_start DATE;
    v_period_end DATE;
    v_spent DECIMAL(15, 2);
    v_budget_amount DECIMAL(15, 2);
    v_percentage DECIMAL(5, 2);
BEGIN
    -- Get transaction details
    v_user_id := NEW.user_id;
    v_amount := NEW.amount;
    
    -- Only check for spending transactions
    IF NEW.type NOT IN ('spend', 'revoke') THEN
        RETURN NEW;
    END IF;
    
    -- Check overall budgets
    FOR v_budget_type IN SELECT DISTINCT budget_type FROM user_budgets WHERE user_id = v_user_id AND is_active = true LOOP
        SELECT period_start, period_end, amount INTO v_period_start, v_period_end, v_budget_amount
        FROM user_budgets
        WHERE user_id = v_user_id 
          AND budget_type = v_budget_type
          AND is_active = true
          AND NEW.created_at::DATE >= period_start
          AND NEW.created_at::DATE <= period_end
        ORDER BY created_at DESC
        LIMIT 1;
        
        IF v_budget_amount IS NOT NULL THEN
            -- Calculate total spent in period
            SELECT COALESCE(SUM(amount), 0) INTO v_spent
            FROM transactions
            WHERE user_id = v_user_id
              AND type IN ('spend', 'revoke')
              AND created_at::DATE >= v_period_start
              AND created_at::DATE <= v_period_end;
            
            v_percentage := (v_spent / v_budget_amount) * 100;
            
            -- Create alert if threshold reached
            IF v_percentage >= 80 AND v_percentage < 100 THEN
                INSERT INTO budget_alerts (user_id, budget_id, budget_type, alert_type, threshold_percentage)
                SELECT v_user_id, id, 'overall', 'warning', v_percentage
                FROM user_budgets
                WHERE user_id = v_user_id 
                  AND budget_type = v_budget_type
                  AND is_active = true
                  AND NEW.created_at::DATE >= period_start
                  AND NEW.created_at::DATE <= period_end
                ORDER BY created_at DESC
                LIMIT 1
                ON CONFLICT DO NOTHING;
            ELSIF v_percentage >= 100 THEN
                INSERT INTO budget_alerts (user_id, budget_id, budget_type, alert_type, threshold_percentage)
                SELECT v_user_id, id, 'overall', 'exceeded', v_percentage
                FROM user_budgets
                WHERE user_id = v_user_id 
                  AND budget_type = v_budget_type
                  AND is_active = true
                  AND NEW.created_at::DATE >= period_start
                  AND NEW.created_at::DATE <= period_end
                ORDER BY created_at DESC
                LIMIT 1
                ON CONFLICT DO NOTHING;
            END IF;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check budgets after transaction
CREATE TRIGGER trigger_check_budget_alerts
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION check_budget_alerts();

COMMENT ON TABLE user_budgets IS 'Overall budgets for users (monthly/weekly/daily)';
COMMENT ON TABLE category_budgets IS 'Category-specific budgets for users';
COMMENT ON TABLE savings_goals IS 'Savings goals that users want to achieve';
COMMENT ON TABLE budget_alerts IS 'Alerts when users approach or exceed budgets';















