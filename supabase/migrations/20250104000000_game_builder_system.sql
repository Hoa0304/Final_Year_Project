-- Game Builder System Migration
-- Low-Code/No-Code system for admins to create custom games

-- Game Templates (pre-built game types)
CREATE TABLE IF NOT EXISTS game_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'quiz', 'memory', 'puzzle', 'trivia', 'word', etc.
    description TEXT,
    icon_url VARCHAR(500),
    config_schema JSONB NOT NULL, -- JSON Schema for configuration validation
    default_config JSONB NOT NULL, -- Default configuration
    ui_config JSONB, -- UI configuration for admin builder
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game Instances (games created by admin using templates)
CREATE TABLE IF NOT EXISTS game_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES game_templates(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL, -- Game-specific configuration (validated against template's config_schema)
    reward_amount DECIMAL(10, 2) DEFAULT 0,
    max_plays_per_day INTEGER DEFAULT 10,
    difficulty_level VARCHAR(20), -- 'easy', 'medium', 'hard'
    estimated_duration INTEGER, -- in seconds
    category VARCHAR(100),
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game Content (questions, cards, puzzle pieces, etc.)
CREATE TABLE IF NOT EXISTS game_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL, -- 'question', 'card', 'puzzle_piece', 'word', etc.
    content_data JSONB NOT NULL, -- Flexible content structure
    order_index INTEGER DEFAULT 0,
    metadata JSONB, -- Additional metadata (difficulty, tags, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game Assets (images, sounds, videos)
CREATE TABLE IF NOT EXISTS game_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL, -- 'image', 'sound', 'video', 'font'
    asset_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER, -- in bytes
    mime_type VARCHAR(100),
    metadata JSONB, -- Additional metadata (dimensions, duration, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game Sessions (track active game sessions)
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
    session_data JSONB, -- Current game state
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'abandoned'
    score DECIMAL(10, 2) DEFAULT 0,
    reward_earned DECIMAL(10, 2) DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_instances_template ON game_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_game_instances_created_by ON game_instances(created_by);
CREATE INDEX IF NOT EXISTS idx_game_instances_active ON game_instances(is_active);
CREATE INDEX IF NOT EXISTS idx_game_content_instance ON game_content(game_instance_id);
CREATE INDEX IF NOT EXISTS idx_game_content_order ON game_content(game_instance_id, order_index);
CREATE INDEX IF NOT EXISTS idx_game_assets_instance ON game_assets(game_instance_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game ON game_sessions(game_instance_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);

-- Update games table to support game instances
-- Add template_id and config to existing games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES game_templates(id);
ALTER TABLE games ADD COLUMN IF NOT EXISTS config JSONB;
ALTER TABLE games ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20);
ALTER TABLE games ADD COLUMN IF NOT EXISTS estimated_duration INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE games ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Insert default game templates
INSERT INTO game_templates (name, type, description, config_schema, default_config, ui_config) VALUES
(
    'Quiz Game',
    'quiz',
    'Multiple choice or true/false quiz game',
    '{
        "type": "object",
        "properties": {
            "timeLimit": {"type": "number", "title": "Time Limit (seconds)", "minimum": 0, "maximum": 600},
            "questionsPerGame": {"type": "number", "title": "Questions Per Game", "minimum": 1, "maximum": 50},
            "shuffleQuestions": {"type": "boolean", "title": "Shuffle Questions"},
            "showCorrectAnswer": {"type": "boolean", "title": "Show Correct Answer After"},
            "passingScore": {"type": "number", "title": "Passing Score (%)", "minimum": 0, "maximum": 100}
        },
        "required": ["timeLimit", "questionsPerGame"]
    }'::jsonb,
    '{
        "timeLimit": 60,
        "questionsPerGame": 10,
        "shuffleQuestions": true,
        "showCorrectAnswer": true,
        "passingScore": 70
    }'::jsonb,
    '{
        "formFields": [
            {"name": "timeLimit", "type": "number", "label": "Time Limit (seconds)"},
            {"name": "questionsPerGame", "type": "number", "label": "Questions Per Game"},
            {"name": "shuffleQuestions", "type": "checkbox", "label": "Shuffle Questions"},
            {"name": "showCorrectAnswer", "type": "checkbox", "label": "Show Correct Answer"},
            {"name": "passingScore", "type": "number", "label": "Passing Score (%)"}
        ]
    }'::jsonb
),
(
    'Memory Match',
    'memory_match',
    'Card matching memory game',
    '{
        "type": "object",
        "properties": {
            "gridSize": {"type": "string", "title": "Grid Size", "enum": ["2x2", "3x3", "4x4", "4x5", "5x5"]},
            "timeLimit": {"type": "number", "title": "Time Limit (seconds)", "minimum": 0},
            "flipDelay": {"type": "number", "title": "Flip Delay (ms)", "minimum": 0},
            "maxAttempts": {"type": "number", "title": "Max Attempts", "minimum": 0}
        },
        "required": ["gridSize"]
    }'::jsonb,
    '{
        "gridSize": "4x4",
        "timeLimit": 120,
        "flipDelay": 1000,
        "maxAttempts": 0
    }'::jsonb,
    '{
        "formFields": [
            {"name": "gridSize", "type": "select", "label": "Grid Size", "options": ["2x2", "3x3", "4x4", "4x5", "5x5"]},
            {"name": "timeLimit", "type": "number", "label": "Time Limit (seconds)"},
            {"name": "flipDelay", "type": "number", "label": "Flip Delay (ms)"},
            {"name": "maxAttempts", "type": "number", "label": "Max Attempts (0 = unlimited)"}
        ]
    }'::jsonb
),
(
    'Trivia Game',
    'trivia',
    'Question and answer trivia game',
    '{
        "type": "object",
        "properties": {
            "timeLimit": {"type": "number", "title": "Time Limit per Question (seconds)"},
            "questionsPerGame": {"type": "number", "title": "Questions Per Game"},
            "categories": {"type": "array", "title": "Categories", "items": {"type": "string"}},
            "difficulty": {"type": "string", "title": "Difficulty", "enum": ["easy", "medium", "hard", "mixed"]}
        },
        "required": ["questionsPerGame"]
    }'::jsonb,
    '{
        "timeLimit": 30,
        "questionsPerGame": 10,
        "categories": [],
        "difficulty": "mixed"
    }'::jsonb,
    '{
        "formFields": [
            {"name": "timeLimit", "type": "number", "label": "Time Limit per Question (seconds)"},
            {"name": "questionsPerGame", "type": "number", "label": "Questions Per Game"},
            {"name": "categories", "type": "multiselect", "label": "Categories"},
            {"name": "difficulty", "type": "select", "label": "Difficulty", "options": ["easy", "medium", "hard", "mixed"]}
        ]
    }'::jsonb
),
(
    'Word Game',
    'word',
    'Word search, crossword, or hangman game',
    '{
        "type": "object",
        "properties": {
            "gameType": {"type": "string", "title": "Game Type", "enum": ["word_search", "crossword", "hangman"]},
            "timeLimit": {"type": "number", "title": "Time Limit (seconds)"},
            "hintsEnabled": {"type": "boolean", "title": "Enable Hints"},
            "maxHints": {"type": "number", "title": "Max Hints", "minimum": 0}
        },
        "required": ["gameType"]
    }'::jsonb,
    '{
        "gameType": "word_search",
        "timeLimit": 300,
        "hintsEnabled": true,
        "maxHints": 3
    }'::jsonb,
    '{
        "formFields": [
            {"name": "gameType", "type": "select", "label": "Game Type", "options": ["word_search", "crossword", "hangman"]},
            {"name": "timeLimit", "type": "number", "label": "Time Limit (seconds)"},
            {"name": "hintsEnabled", "type": "checkbox", "label": "Enable Hints"},
            {"name": "maxHints", "type": "number", "label": "Max Hints"}
        ]
    }'::jsonb
);

-- Trigger to update updated_at
CREATE TRIGGER update_game_templates_updated_at
    BEFORE UPDATE ON game_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_instances_updated_at
    BEFORE UPDATE ON game_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE game_templates IS 'Pre-built game templates that admins can use to create games';
COMMENT ON TABLE game_instances IS 'Game instances created by admins using templates';
COMMENT ON TABLE game_content IS 'Content items for games (questions, cards, etc.)';
COMMENT ON TABLE game_assets IS 'Assets (images, sounds) for games';
COMMENT ON TABLE game_sessions IS 'Active game sessions for users';







