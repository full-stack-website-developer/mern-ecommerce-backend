import express from 'express';

import userController from '../controllers/user.controller.js';
import { validate } from '../middleware/validation.middleware.js';
import { registerSchema, loginSchema } from '../validators/user.validator.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const userRouter = express.Router();

userRouter.post('/register', validate(registerSchema), userController.register);
userRouter.post('/login',  validate(loginSchema), userController.login);
// userRouter.get('/users', authMiddleware.authenticateToken, userController.getUsers);
userRouter.get('/verify-token', authenticateToken, userController.verifyToken)
userRouter.post('/forgot-password', userController.forgotPassword);
userRouter.post('/verify-otp/:email', userController.verifyOTP);
userRouter.post('/change-password/:email', userController.changePassword);
userRouter.post('/google/:code', userController.googleLogin);

export default userRouter;