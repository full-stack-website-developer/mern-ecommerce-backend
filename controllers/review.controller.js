import reviewService from '../services/review.service.js';
import { asyncHandler } from '../utils/async-handler.util.js';
import ApiResponse from '../utils/response.util.js';

class ReviewController {
    createReview = asyncHandler(async (req, res) => {
        const userId = req.user?.id || req.user?._id;
        const review = await reviewService.createReview(userId, req.body);

        return ApiResponse.success(res, review, 'Review created successfully', 201);
    });

    getProductReviews = asyncHandler(async (req, res) => {
        const { productId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const data = await reviewService.getProductReviews(productId, {
            page: Number(page),
            limit: Number(limit),
        });

        return ApiResponse.success(res, data, 'Product reviews fetched successfully', 200);
    });

    getUserReviews = asyncHandler(async (req, res) => {
        const userId = req.user?.id || req.user?._id;
        const reviews = await reviewService.getUserReviews(userId);

        return ApiResponse.success(res, reviews, 'User reviews fetched successfully', 200);
    });
}

export default new ReviewController();
