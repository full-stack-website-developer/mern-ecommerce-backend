import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.middleware.js';
import adminController from '../controllers/admin.controller.js';

const adminRouter = express.Router();

adminRouter.get(
  '/users',
  authenticateToken,
  authorize('admin'),
  adminController.listUsers
);

adminRouter.patch(
  '/seller/:id/status',
  authenticateToken,
  authorize('admin'),
  adminController.updateSellerStatus
);

export default adminRouter;