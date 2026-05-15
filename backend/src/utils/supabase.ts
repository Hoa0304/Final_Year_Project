// Import env config FIRST to ensure .env is loaded
import '../config/env';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

/**
 * Initialize Supabase client with service role key for backend operations
 * This client has admin privileges and bypasses RLS policies
 */
const supabaseUrl = env.SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

// Debug: Log environment variables (only in development)
if (env.NODE_ENV === 'development') {
  console.log('🔍 Environment check:');
  console.log('   SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? `✅ Set (${supabaseServiceKey.length} chars)` : '❌ Missing');
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required!');
  console.error('   Please check your backend/.env file');
  console.error('   Current SUPABASE_URL:', supabaseUrl);
  console.error('   Working directory:', process.cwd());
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required. Please check backend/.env file');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

/**
 * Initialize Supabase client with anon key for user operations
 * This client respects RLS policies
 */
const supabaseAnonKey = env.SUPABASE_ANON_KEY;

export const supabaseAnon = createClient(
  supabaseUrl,
  supabaseAnonKey
);

