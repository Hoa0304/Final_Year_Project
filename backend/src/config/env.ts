/**
 * Environment configuration
 * This file must be imported FIRST before any other modules that use environment variables
 */
import dotenv from 'dotenv';
import path from 'path';

// Load .env file from backend directory
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('⚠️  Could not load .env file:', result.error.message);
  console.warn('   Trying alternative path...');
  
  // Try alternative path
  const altPath = path.resolve(process.cwd(), '.env');
  const altResult = dotenv.config({ path: altPath });
  
  if (altResult.error) {
    console.warn('⚠️  Could not load .env from alternative path either');
  } else {
    console.log('✅ Loaded .env from:', altPath);
  }
} else {
  console.log('✅ Loaded .env from:', envPath);
}

// Export environment variables with defaults
export const env = {
  PORT: process.env.PORT || '3002',
  NODE_ENV: process.env.NODE_ENV || 'development',
  SUPABASE_URL: process.env.SUPABASE_URL || 'http://localhost:54330',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:3003',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:19006',
  // Cloudinary configuration
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || 'gsk_x7t83BLPIITOkb05Z70IWGdyb3FYLwjJkc8T0tqQg',
  // Blockchain configuration (optional)
  BLOCKCHAIN_RPC_URL: process.env.BLOCKCHAIN_RPC_URL || '',
  BLOCKCHAIN_TOKEN_ADDRESS: process.env.BLOCKCHAIN_TOKEN_ADDRESS || '',
  BLOCKCHAIN_REGISTRY_ADDRESS: process.env.BLOCKCHAIN_REGISTRY_ADDRESS || '',
  BLOCKCHAIN_TASK_SYSTEM_ADDRESS: process.env.BLOCKCHAIN_TASK_SYSTEM_ADDRESS || '',
  BLOCKCHAIN_PRIVATE_KEY: process.env.BLOCKCHAIN_PRIVATE_KEY || '',
};

// Blockchain config object
export const config = {
  blockchain: {
    rpcUrl: env.BLOCKCHAIN_RPC_URL,
    tokenAddress: env.BLOCKCHAIN_TOKEN_ADDRESS,
    registryAddress: env.BLOCKCHAIN_REGISTRY_ADDRESS,
    taskSystemAddress: env.BLOCKCHAIN_TASK_SYSTEM_ADDRESS,
    privateKey: env.BLOCKCHAIN_PRIVATE_KEY,
  },
};

// Validate required environment variables
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required!');
  console.error('   Please check your backend/.env file');
  console.error('   Current working directory:', process.cwd());
  console.error('   Tried loading from:', envPath);
}


