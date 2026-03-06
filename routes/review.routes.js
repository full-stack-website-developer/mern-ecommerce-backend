import express from 'express';
import reviewController from '../controllers/review.controller.js';
import { authenticateToken, authorize } from '../middleware/auth.middleware.js';

const reviewRouter = express.Router();

reviewRouter.post('/', authenticateToken, authorize('user', 'admin', 'seller'), reviewController.createReview);
reviewRouter.get('/product/:productId', reviewController.getProductReviews);
reviewRouter.get('/my', authenticateToken, reviewController.getUserReviews);

export default reviewRouter;
