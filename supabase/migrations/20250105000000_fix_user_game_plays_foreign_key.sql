-- Fix user_game_plays foreign key constraint
-- Remove foreign key constraint to games table since game_id can reference both games and game_instances
-- Validation is handled in application code

-- Drop the existing foreign key constraint
ALTER TABLE user_game_plays 
DROP CONSTRAINT IF EXISTS user_game_plays_game_id_fkey;

-- Note: We don't add a new foreign key constraint because:
-- 1. PostgreSQL doesn't support foreign keys to multiple tables
-- 2. We validate game existence in application code (game.service.ts)
-- 3. This allows game_id to reference either games.id or game_instances.id

-- The constraint is replaced by application-level validation in:
-- - backend/src/services/game.service.ts (recordGamePlay function)
-- - backend/src/services/game.service.ts (canUserPlayGame function)

























