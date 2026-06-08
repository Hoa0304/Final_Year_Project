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

  // VNPay configuration
  VNP_TMN_CODE: process.env.VNP_TMN_CODE || '',
  VNP_HASH_SECRET: process.env.VNP_HASH_SECRET || '',
  VNP_URL: process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  // MoMo configuration
  MOMO_PARTNER_CODE: process.env.MOMO_PARTNER_CODE || 'MOMOBKUN20180810',
  MOMO_ACCESS_KEY: process.env.MOMO_ACCESS_KEY || 'klm05Blk5mfgUdPn',
  MOMO_SECRET_KEY: process.env.MOMO_SECRET_KEY || 'at118clm740NWZo1TB152wD68EPnH40c',
  MOMO_API_URL: process.env.MOMO_API_URL || 'https://test-payment.momo.vn/v2/gateway/api/create',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  API_URL: process.env.API_URL || 'http://localhost:3002',
};

// Blockchain config object is disabled

// Validate required environment variables
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required!');
  console.error('   Please check your backend/.env file');
  console.error('   Current working directory:', process.cwd());
  console.error('   Tried loading from:', envPath);
}


