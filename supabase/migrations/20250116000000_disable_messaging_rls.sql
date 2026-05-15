-- Disable RLS for messaging tables
-- This migration disables Row Level Security for all messaging-related tables

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own read receipts" ON message_reads;
DROP POLICY IF EXISTS "Users can create their own read receipts" ON message_reads;

-- Disable RLS for messaging tables
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads DISABLE ROW LEVEL SECURITY;

-- Also disable RLS for users table if it exists (to allow querying user data)
-- Drop any existing policies on users table
DO $$
BEGIN
    -- Drop all policies on users table
    DROP POLICY IF EXISTS "Users can view their own profile" ON users;
    DROP POLICY IF EXISTS "Users can update their own profile" ON users;
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
    DROP POLICY IF EXISTS "Users can view all users" ON users;
    DROP POLICY IF EXISTS "Service role can do anything" ON users;
    
    -- Disable RLS on users table
    ALTER TABLE users DISABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN
        -- If table doesn't exist or RLS is not enabled, just continue
        RAISE NOTICE 'Could not disable RLS on users table: %', SQLERRM;
END $$;
















