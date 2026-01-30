import { createRequire } from 'module';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';

const require = createRequire(import.meta.url);
const { clean: xssCleanFn } = require('xss-clean/lib/xss.js');

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth route limiter (stricter)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    skipSuccessfulRequests: true,
    message: 'Too many login attempts, please try again later'
});

/**
 * Express 5–safe mongo sanitize: only sanitizes body and params.
 * Skips req.query (and req.headers) because in Express 5 they are getter-only
 * and cannot be reassigned, which would throw.
 */
function mongoSanitizeSafe(options = {}) {
  return function (req, res, next) {
    ['body', 'params'].forEach((key) => {
      if (req[key] && typeof req[key] === 'object') {
        req[key] = mongoSanitize.sanitize(req[key], options);
      }
    });
    next();
  };
}

/**
 * Express 5–safe xss: only cleans body and params (not req.query).
 * xss-clean assigns to req.query which is getter-only in Express 5.
 */
function xssSafe(req, res, next) {
  if (req.body) req.body = xssCleanFn(req.body);
  if (req.params) req.params = xssCleanFn(req.params);
  next();
}

const security = {
  helmet: helmet(),
  mongoSanitize: mongoSanitizeSafe({ replaceWith: '_' }),
  xss: xssSafe,
  hpp: hpp(),
  limiter,
  authLimiter,
};

export default security;