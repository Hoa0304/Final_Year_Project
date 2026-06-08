// Import env config FIRST to ensure .env is loaded before any other imports
import './config/env';

import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import * as swaggerDocument from './config/swagger.json';

// Import routes (after dotenv.config)
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import productRoutes from './routes/product.routes';
import taskRoutes from './routes/task.routes';
import recommendationRoutes from './routes/recommendation.routes';
import adminRoutes from './routes/admin.routes';
import vendorRoutes from './routes/vendor.routes';
import transactionLabelRoutes from './routes/transaction-label.routes';
import shoppingCartRoutes from './routes/shopping-cart.routes';
import purchaseHistoryRoutes from './routes/purchase-history.routes';
import aiSuggestionsRoutes from './routes/ai-suggestions.routes';
import uploadRoutes from './routes/upload.routes';
import notificationRoutes from './routes/notification.routes';
import vendorPublicRoutes from './routes/vendor-public.routes';
import budgetRoutes from './routes/budget.routes';
import chatRoutes from './routes/chat.routes';
import socialRoutes from './routes/social.routes';
import messagingRoutes from './routes/messaging.routes';
import paymentRoutes from './routes/payment.routes';
import orderRoutes from './routes/order.routes';

// Import env config
import { env } from './config/env';



// Initialize Express app
const app = express();

// Trust proxy to correctly handle X-Forwarded-For headers (for tunnel/remote devices)
app.set('trust proxy', process.env.NODE_ENV === 'development' ? true : 1);

const PORT = parseInt(env.PORT, 10);

// Middleware
// In development, allow all origins for tunnel mode
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' 
    ? true // Allow all origins in development (for tunnel mode)
    : env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
console.log('🔧 CORS Configuration:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   CORS Origin:', process.env.NODE_ENV === 'development' ? 'All origins (development)' : env.CORS_ORIGIN);

// Serve static files from 'public' directory
app.use(express.static('public'));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

import rateLimit from 'express-rate-limit';

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 100, // Raise limit significantly in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Stricter limiter for sensitive routes
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 1000 : 20, // Raise limit significantly in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again in an hour.' }
});

app.use(globalLimiter);
app.use('/api/auth', sensitiveLimiter);
app.use('/api/payments/create', sensitiveLimiter);
app.use('/api/payment/create', sensitiveLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/transactions', transactionLabelRoutes);
app.use('/api/cart', shoppingCartRoutes);
app.use('/api/purchase-history', purchaseHistoryRoutes);
app.use('/api/suggestions', aiSuggestionsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/vendors', vendorPublicRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/orders', orderRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server - listen on all interfaces (0.0.0.0) to allow connections from other devices
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${env.NODE_ENV}`);
  console.log(`🌐 Accessible at:`);
  console.log(`   - http://localhost:${PORT}`);
  console.log(`   - http://127.0.0.1:${PORT}`);
  console.log(`   - http://YOUR_IP_ADDRESS:${PORT} (for tunnel/remote devices)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;

