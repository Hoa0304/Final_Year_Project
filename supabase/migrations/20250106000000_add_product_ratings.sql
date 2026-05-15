-- Product Ratings System Migration
-- Allows users to rate and review products they have purchased

-- Product ratings table
CREATE TABLE IF NOT EXISTS product_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure one rating per user per product
    UNIQUE(user_id, product_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_ratings_product_id ON product_ratings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_user_id ON product_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_created_at ON product_ratings(created_at);

-- Trigger to update updated_at
CREATE TRIGGER update_product_ratings_updated_at
    BEFORE UPDATE ON product_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE product_ratings IS 'User ratings and reviews for products they have purchased';
COMMENT ON COLUMN product_ratings.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN product_ratings.review_text IS 'Optional text review/comment';

























