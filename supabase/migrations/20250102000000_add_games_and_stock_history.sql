-- Games table for mini-games (TicTacToe, etc.)
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    reward_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    max_plays_per_day INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User game plays (track game attempts and wins)
CREATE TABLE user_game_plays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    result VARCHAR(20) NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
    reward_earned DECIMAL(10, 2) DEFAULT 0,
    game_data JSONB, -- Store game-specific data (e.g., moves, board state)
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock price history (track price changes over time)
CREATE TABLE stock_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
    price DECIMAL(15, 2) NOT NULL,
    price_change_percent DECIMAL(5, 2) DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_game_plays_user_id ON user_game_plays(user_id);
CREATE INDEX idx_user_game_plays_game_id ON user_game_plays(game_id);
CREATE INDEX idx_user_game_plays_played_at ON user_game_plays(played_at);
CREATE INDEX idx_stock_price_history_stock_id ON stock_price_history(stock_id);
CREATE INDEX idx_stock_price_history_recorded_at ON stock_price_history(recorded_at);

-- Insert default games
INSERT INTO games (name, description, reward_amount, max_plays_per_day, is_active) VALUES
('TicTacToe', 'Classic Tic-Tac-Toe game. Win to earn coins!', 50.00, 20, true),
('Memory Match', 'Match pairs of cards to win coins', 30.00, 15, true),
('Number Puzzle', 'Solve number puzzles to earn rewards', 25.00, 10, true);

-- Trigger to update updated_at for games
CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


