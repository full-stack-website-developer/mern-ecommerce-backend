import express from 'express';
import cors from 'cors';
import config from './config/app.config.js';
import { AppError } from './utils/errors.util.js';
import errorHandler from './middleware/error-handler.middleware.js';
import security from './middleware/security.middleware.js';

import {
    addressRoutes,
    adminRoutes,
    authRoutes,
    brandRoutes,
    cartRoutes,
    categoryRoutes,
    chatRoutes,
    couponRoutes,
    dashboardRoutes,
    optionRoutes,
    orderRoutes,
    productRoutes,
    reviewRoutes,
    sellerRoutes,
    userRoutes,
} from './routes/index.js';

// Payment routes (Stripe webhook + PayPal capture)
import paymentRoutes from './routes/payment.routes.js';

const app = express();

app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err.stack);

  res.status(500).json({
    success: false,
    message: err.message,
  });
});

// Security
app.use(security.helmet);
app.use(security.xss);
app.use(security.hpp);

// Rate limiting
app.use('/api', security.limiter);
app.use('/api/auth', security.authLimiter);

// CORS
app.use(cors(config.cors));

// ─── CRITICAL: Stripe webhook raw body ───────────────────────────────────────
// Must be registered BEFORE express.json().
// Stripe verifies its signature against the exact raw bytes it sent.
// If express.json() runs first, it parses the body into an object → bytes change
// → signature mismatch → "Payload was provided as a parsed JavaScript object" error.
// express.raw() preserves req.body as a Buffer for this route only.
app.use(
    '/api/payments/stripe/webhook',
    express.raw({ type: 'application/json' })
);

// Body parsing for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mongo sanitize
app.use(security.mongoSanitize);

// Routes
app.use('/api/auth',       authRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/sellers',    sellerRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/options',    optionRoutes);
app.use('/api/brands',     brandRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/cart',       cartRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/payments',   paymentRoutes); 
app.use('/api/addresses',   addressRoutes); 
app.use('/api/chat',   chatRoutes); 
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res, next) => {
    next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// Error handler
app.use(errorHandler);

export default app;
