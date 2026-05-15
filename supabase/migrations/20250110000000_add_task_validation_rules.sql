-- Add validation_rule field to tasks table
-- This field stores JSON configuration for task validation rules
-- Example: {"type": "purchase", "productKeyword": "laptop", "count": 1}
-- Example: {"type": "play_game", "count": 1}
-- Example: {"type": "buy_stock", "count": 1}
-- Example: {"type": "complete_tasks", "count": 3}
-- Example: {"type": "manual"} - no validation needed, can complete directly

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS validation_rule JSONB DEFAULT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN tasks.validation_rule IS 'JSON configuration for task validation rules. Types: purchase, play_game, buy_stock, complete_tasks, manual';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_validation_rule ON tasks USING GIN (validation_rule);




















