
import express from 'express';
import cors from 'cors';
import security from './middleware/security.middleware.js';
import config from './config/app.config.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import errorHandler from './middleware/error-handler.middleware.js';
import { AppError } from './utils/errors.util.js';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Security
app.use(security.helmet);
app.use(security.xss);
app.use(security.hpp);

// Rate limiting
app.use('/api', security.limiter);
app.use('/api/auth', security.authLimiter);

// CORS
app.use(cors(config.cors));

// Body parsing (must be before mongoSanitize so req.body exists for login etc.)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mongo sanitize (Express 5–safe: only body & params, does not touch req.query)
app.use(security.mongoSanitize);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// 404
app.use((req, res, next) => {
  console.log('here');
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// Error handler
app.use(errorHandler);

export default app;
