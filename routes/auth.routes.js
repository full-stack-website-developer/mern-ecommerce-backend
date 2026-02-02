import express from 'express';

import authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validation.middleware.js';
import { registerSchema, loginSchema } from '../validators/user.validator.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const authRouter = express.Router();

authRouter.post('/register', validate(registerSchema), authController.register);
authRouter.post('/login',  validate(loginSchema), authController.login);
authRouter.get('/verify-token', authenticateToken, authController.verifyToken)
authRouter.post('/forgot-password', authController.forgotPassword);
authRouter.post('/verify-otp/:email', authController.verifyOTP);
authRouter.post('/change-password/:email', authController.changePassword);
authRouter.post('/google/:code', authController.googleLogin);

export default authRouter;