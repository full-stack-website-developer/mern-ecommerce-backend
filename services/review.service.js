import mongoose from 'mongoose';
import orderRepository from '../repositories/order.repository.js';
import reviewRepository from '../repositories/review.repository.js';
import { AppError } from '../utils/errors.util.js';

class ReviewService {
    /**
     * Create a verified review for a purchased and delivered product.
     * @param {string} userId
     * @param {{productId: string, orderId?: string, rating: number, title?: string, body?: string}} payload
     * @returns {Promise<object>}
     */
    async createReview(userId, { productId, orderId, rating, title, body }) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new AppError('Invalid user', 400);
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new AppError('Invalid product', 400);
        }

        if (!rating || Number(rating) < 1 || Number(rating) > 5) {
            throw new AppError('Rating must be between 1 and 5', 400);
        }

        const existingReview = await reviewRepository.findByProductAndUser(productId, userId);
        if (existingReview) {
            throw new AppError('You have already reviewed this product', 409);
        }

        const { order, reason } = await this._findEligibleDeliveredOrder(userId, productId, orderId);
        if (!order) {
            if (reason === 'not_delivered') {
                throw new AppError('You can review this product after it is delivered', 403);
            }
            throw new AppError('You can only review products you have purchased and received', 403);
        }

        return reviewRepository.create({
            productId,
            userId,
            orderId: order._id,
            rating: Number(rating),
            title: title?.trim() || '',
            body: body?.trim() || '',
            isVerifiedPurchase: true,
        });
    }

    /**
     * Get paginated approved reviews and rating stats for a product.
     * @param {string} productId
     * @param {{page?: number, limit?: number}} params
     * @returns {Promise<{reviews: object[], stats: object, pagination: object}>}
     */
    async getProductReviews(productId, { page = 1, limit = 10 } = {}) {
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new AppError('Invalid product', 400);
        }

        const safePage = Number(page) > 0 ? Number(page) : 1;
        const safeLimit = Number(limit) > 0 ? Number(limit) : 10;

        const [reviewData, stats] = await Promise.all([
            reviewRepository.findByProductId(productId, { page: safePage, limit: safeLimit }),
            reviewRepository.getAggregatedRating(productId),
        ]);

        return {
            reviews: reviewData.reviews,
            stats,
            pagination: {
                total: reviewData.total,
                page: reviewData.page,
                limit: reviewData.limit,
                totalPages: reviewData.totalPages,
            },
        };
    }

    /**
     * Get all reviews created by the authenticated user.
     * @param {string} userId
     * @returns {Promise<object[]>}
     */
    async getUserReviews(userId) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new AppError('Invalid user', 400);
        }

        return reviewRepository.findByUserId(userId);
    }

    /**
     * Resolve a delivered order containing the target product for this user.
     * @param {string} userId
     * @param {string} productId
     * @param {string | undefined} orderId
     * @returns {Promise<{order: object | null, reason: 'eligible' | 'not_delivered' | 'not_purchased'}>}
     */
    async _findEligibleDeliveredOrder(userId, productId, orderId) {
        if (orderId) {
            if (!mongoose.Types.ObjectId.isValid(orderId)) {
                throw new AppError('Invalid order', 400);
            }

            const selectedOrder = await orderRepository.findById(orderId);
            if (!selectedOrder || String(selectedOrder.userId?._id || selectedOrder.userId) !== String(userId)) {
                return { order: null, reason: 'not_purchased' };
            }

            const hasPurchasedItem = (selectedOrder.subOrder || []).some((subOrder) => {
                const containsProduct = (subOrder?.items || []).some(
                    (item) => String(item.productId?._id || item.productId) === String(productId)
                );

                return containsProduct;
            });

            if (!hasPurchasedItem) {
                return { order: null, reason: 'not_purchased' };
            }

            const isReceived = selectedOrder.status === 'closed' || (selectedOrder.subOrder || []).some((subOrder) => {
                const delivered = ['delivered', 'returned'].includes(subOrder?.fulfillmentStatus);
                const containsProduct = (subOrder?.items || []).some(
                    (item) => String(item.productId?._id || item.productId) === String(productId)
                );

                return delivered && containsProduct;
            });

            return isReceived
                ? { order: selectedOrder, reason: 'eligible' }
                : { order: null, reason: 'not_delivered' };
        }

        const eligibleOrder = await orderRepository.findReviewEligibleOrderByUserAndProduct(userId, productId);
        if (eligibleOrder) {
            return { order: eligibleOrder, reason: 'eligible' };
        }

        const purchasedOrder = await orderRepository.findOrderByUserAndProduct(userId, productId);
        if (purchasedOrder) {
            return { order: null, reason: 'not_delivered' };
        }

        return { order: null, reason: 'not_purchased' };
    }
}

export default new ReviewService();
