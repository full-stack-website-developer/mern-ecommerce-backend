import Review from '../models/review.model.js';
import mongoose from 'mongoose';

class ReviewRepository {
    async create(data) {
        return Review.create(data);
    }

    async findByProductId(productId, { page = 1, limit = 10 } = {}) {
        const safePage = Number(page) > 0 ? Number(page) : 1;
        const safeLimit = Number(limit) > 0 ? Number(limit) : 10;

        const query = {
            productId,
            status: 'approved',
        };

        const [reviews, total] = await Promise.all([
            Review.find(query)
                .populate('userId', 'firstName lastName avatar')
                .sort({ createdAt: -1 })
                .skip((safePage - 1) * safeLimit)
                .limit(safeLimit),
            Review.countDocuments(query),
        ]);

        return {
            reviews,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit) || 1,
        };
    }

    async findByUserId(userId) {
        return Review.find({ userId })
            .populate('productId', 'name mainImage')
            .sort({ createdAt: -1 });
    }

    async findByProductAndUser(productId, userId) {
        return Review.findOne({ productId, userId });
    }

    async getAggregatedRating(productId) {
        const [summary] = await Review.aggregate([
            {
                $match: {
                    productId: new mongoose.Types.ObjectId(String(productId)),
                    status: 'approved',
                },
            },
            {
                $group: {
                    _id: '$productId',
                    avgRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 },
                    ratings: { $push: '$rating' },
                },
            },
            {
                $project: {
                    avgRating: { $round: ['$avgRating', 1] },
                    totalReviews: 1,
                    distribution: {
                        '1': {
                            $size: {
                                $filter: {
                                    input: '$ratings',
                                    as: 'r',
                                    cond: { $eq: ['$$r', 1] },
                                },
                            },
                        },
                        '2': {
                            $size: {
                                $filter: {
                                    input: '$ratings',
                                    as: 'r',
                                    cond: { $eq: ['$$r', 2] },
                                },
                            },
                        },
                        '3': {
                            $size: {
                                $filter: {
                                    input: '$ratings',
                                    as: 'r',
                                    cond: { $eq: ['$$r', 3] },
                                },
                            },
                        },
                        '4': {
                            $size: {
                                $filter: {
                                    input: '$ratings',
                                    as: 'r',
                                    cond: { $eq: ['$$r', 4] },
                                },
                            },
                        },
                        '5': {
                            $size: {
                                $filter: {
                                    input: '$ratings',
                                    as: 'r',
                                    cond: { $eq: ['$$r', 5] },
                                },
                            },
                        },
                    },
                },
            },
        ]);

        return (
            summary || {
                avgRating: 0,
                totalReviews: 0,
                distribution: {
                    1: 0,
                    2: 0,
                    3: 0,
                    4: 0,
                    5: 0,
                },
            }
        );
    }

    async getAggregatedRatingForProducts(productIds = []) {
        if (!Array.isArray(productIds) || productIds.length === 0) {
            return {};
        }

        const objectIds = productIds
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(String(id)));

        if (objectIds.length === 0) {
            return {};
        }

        const rows = await Review.aggregate([
            {
                $match: {
                    productId: { $in: objectIds },
                    status: 'approved',
                },
            },
            {
                $group: {
                    _id: '$productId',
                    avgRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 },
                },
            },
            {
                $project: {
                    avgRating: { $round: ['$avgRating', 1] },
                    totalReviews: 1,
                },
            },
        ]);

        return rows.reduce((acc, row) => {
            acc[String(row._id)] = {
                avgRating: Number(row.avgRating) || 0,
                totalReviews: Number(row.totalReviews) || 0,
            };
            return acc;
        }, {});
    }
}

export default new ReviewRepository();
