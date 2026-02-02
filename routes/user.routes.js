import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import UserController from '../controllers/user.controller.js';
import { upload } from '../config/cloudinary.js';

const userRouter = express.Router();
// Store files in memory or disk

userRouter.get('/me', authenticateToken, UserController.getMe);
userRouter.patch('/me/personal-info', authenticateToken, UserController.updatePersonalInfo);
userRouter.patch('/me/address/:id', authenticateToken, UserController.updateAddress);
userRouter.get('/me/address', authenticateToken, UserController.getAddress);
userRouter.post('/me/address', authenticateToken, UserController.createAddress);
userRouter.patch('/me/password', authenticateToken, UserController.changePassword);
userRouter.post('/me/password', authenticateToken, UserController.createPassword);
userRouter.patch('/me/avatar', authenticateToken, upload.single('avatar'), UserController.updateAvatar);

export default userRouter;