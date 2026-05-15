-- Social Discussion System Migration
-- Adds discussion threads, posts, comments, and moderation features

-- Discussion threads table
CREATE TABLE IF NOT EXISTS discussion_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_urls TEXT[], -- Array of image URLs
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discussion posts/comments table
CREATE TABLE IF NOT EXISTS discussion_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID REFERENCES discussion_threads(id) ON DELETE CASCADE NOT NULL,
    parent_post_id UUID REFERENCES discussion_posts(id) ON DELETE CASCADE, -- For nested replies
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    image_urls TEXT[], -- Array of image URLs
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post reactions/likes table
CREATE TABLE IF NOT EXISTS post_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES discussion_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reaction_type VARCHAR(20) DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'helpful', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id) -- One reaction per user per post
);

-- Thread reactions/likes table
CREATE TABLE IF NOT EXISTS thread_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID REFERENCES discussion_threads(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reaction_type VARCHAR(20) DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'helpful', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(thread_id, user_id) -- One reaction per user per thread
);

-- Content reports table (for moderation)
CREATE TABLE IF NOT EXISTS content_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reported_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('thread', 'post')),
    content_id UUID NOT NULL, -- Can be thread_id or post_id
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_discussion_threads_product_id ON discussion_threads(product_id);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_created_by ON discussion_threads(created_by);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_created_at ON discussion_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_is_pinned ON discussion_threads(is_pinned);

CREATE INDEX IF NOT EXISTS idx_discussion_posts_thread_id ON discussion_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_discussion_posts_parent_post_id ON discussion_posts(parent_post_id);
CREATE INDEX IF NOT EXISTS idx_discussion_posts_created_by ON discussion_posts(created_by);
CREATE INDEX IF NOT EXISTS idx_discussion_posts_created_at ON discussion_posts(created_at);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON post_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_thread_reactions_thread_id ON thread_reactions(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_reactions_user_id ON thread_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_content_reports_content ON content_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_discussion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at
CREATE TRIGGER update_discussion_threads_updated_at
    BEFORE UPDATE ON discussion_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_discussion_updated_at();

CREATE TRIGGER update_discussion_posts_updated_at
    BEFORE UPDATE ON discussion_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_discussion_updated_at();

-- Enable Row Level Security
ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discussion_threads
CREATE POLICY "Anyone can view active threads" ON discussion_threads
    FOR SELECT USING (is_deleted = false);

CREATE POLICY "Users can create threads" ON discussion_threads
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own threads" ON discussion_threads
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own threads" ON discussion_threads
    FOR UPDATE USING (auth.uid() = created_by); -- Soft delete via is_deleted

-- RLS Policies for discussion_posts
CREATE POLICY "Anyone can view active posts" ON discussion_posts
    FOR SELECT USING (is_deleted = false);

CREATE POLICY "Users can create posts" ON discussion_posts
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own posts" ON discussion_posts
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own posts" ON discussion_posts
    FOR UPDATE USING (auth.uid() = created_by); -- Soft delete via is_deleted

-- RLS Policies for reactions
CREATE POLICY "Anyone can view reactions" ON post_reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own reactions" ON post_reactions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view thread reactions" ON thread_reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own thread reactions" ON thread_reactions
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for content_reports
CREATE POLICY "Users can view their own reports" ON content_reports
    FOR SELECT USING (auth.uid() = reported_by);

CREATE POLICY "Users can create reports" ON content_reports
    FOR INSERT WITH CHECK (auth.uid() = reported_by);

-- Comments
COMMENT ON TABLE discussion_threads IS 'Discussion threads related to products';
COMMENT ON TABLE discussion_posts IS 'Posts/comments in discussion threads';
COMMENT ON TABLE post_reactions IS 'User reactions to posts (likes, etc.)';
COMMENT ON TABLE thread_reactions IS 'User reactions to threads (likes, etc.)';
COMMENT ON TABLE content_reports IS 'Reports for inappropriate content moderation';















