import mongoose from 'mongoose';
import Order from '../models/order.model.js';

// ─────────────────────────────────────────────────────────────────────────────
//  OrderRepository
//  Rule: ONLY Mongoose queries live here. No business logic.
// ─────────────────────────────────────────────────────────────────────────────
const POPULATE_ITEMS = [
    { path: 'subOrder.items.productId', select: 'name mainImage price sku slug' },
    {
        path: 'subOrder.items.variantId',
        select: 'options price sku',
        populate: {
            path: 'options.optionId',
            select: 'name values',
        },
    },
    { path: 'userId', select: 'firstName lastName email' },
    { path: 'subOrder.sellerId', select: 'businessName' },
];

class OrderRepository {
    // _basePopulate(query) {
    //     return query
    //         .populate('subOrder.items.productId', 'name mainImage price sku')
    //         .populate('subOrder.items.variantId', 'options price sku')
    //         .populate('userId', 'firstName lastName email');
    // }

    // create(data) {
    //     return new Order(data).save();
    // }

    // findById(id) {
    //     return this._basePopulate(Order.findById(id));
    // }

    // findByUserId(userId, { page = 1, limit = 10, status, paymentStatus, fulfillmentStatus } = {}) {
    //     const query = {
    //         userId,
    //         ...(status && { status }),
    //         ...(paymentStatus && { paymentStatus }),
    //         ...(fulfillmentStatus && { 'subOrder.fulfillmentStatus': fulfillmentStatus }),
    //     };

    //     return this._basePopulate(Order.find(query))
    //         .sort({ createdAt: -1 })
    //         .skip((page - 1) * limit)
    //         .limit(limit);
    // }

    // countByUserId(userId, { status, paymentStatus, fulfillmentStatus } = {}) {
    //     const query = {
    //         userId,
    //         ...(status && { status }),
    //         ...(paymentStatus && { paymentStatus }),
    //         ...(fulfillmentStatus && { 'subOrder.fulfillmentStatus': fulfillmentStatus }),
    //     };
    //     return Order.countDocuments(query);
    // }

    // findByOrderNumber(orderNumber) {
    //     return Order.findOne({ orderNumber });
    // }

    // // Used by payment gateway webhooks to look up the pending order
    // findByGatewayRef(gatewayTransactionId) {
    //     return Order.findOne({ gatewayTransactionId });
    // }

    // updatePaymentStatus(id, paymentStatus, extra = {}) {
    //     return Order.findByIdAndUpdate(
    //         id,
    //         { paymentStatus, ...extra },
    //         { new: true }
    //     );
    // }

    // updateStatus(id, status) {
    //     return Order.findByIdAndUpdate(id, { status }, { new: true });
    // }

    // async findBySellerId(sellerId, { page = 1, limit = 10, status, paymentStatus, fulfillmentStatus } = {}) {
    //     const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    //     const query = {
    //         'subOrder.sellerId': sellerObjectId,
    //         ...(status && { status }),
    //         ...(paymentStatus && { paymentStatus }),
    //         ...(fulfillmentStatus && { 'subOrder.fulfillmentStatus': fulfillmentStatus }),
    //     };

    //     return this._basePopulate(Order.find(query))
    //         .sort({ createdAt: -1 })
    //         .skip((page - 1) * limit)
    //         .limit(limit);
    // }

    // async countBySellerId(sellerId, { status, paymentStatus, fulfillmentStatus } = {}) {
    //     const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    //     const query = {
    //         'subOrder.sellerId': sellerObjectId,
    //         ...(status && { status }),
    //         ...(paymentStatus && { paymentStatus }),
    //         ...(fulfillmentStatus && { 'subOrder.fulfillmentStatus': fulfillmentStatus }),
    //     };

    //     return Order.countDocuments(query);
    // }

    // // -------------------------

    // async findByCustomerId(customerId, { page = 1, limit = 10, status, paymentStatus, fulfillmentStatus } = {}) {
    //     const query = {
    //         userId: customerId,
    //         ...(status && { status }),
    //         ...(paymentStatus && { paymentStatus }),
    //         ...(fulfillmentStatus && { 'subOrder.fulfillmentStatus': fulfillmentStatus }),
    //     };

    //     return this._basePopulate(Order.find(query))
    //         .sort({ createdAt: -1 })
    //         .skip((page - 1) * limit)
    //         .limit(limit);
    // }

    // async countByCustomerId(customerId, { status, paymentStatus, fulfillmentStatus } = {}) {
    //     const query = {
    //         userId: customerId,
    //         ...(status && { status }),
    //         ...(paymentStatus && { paymentStatus }),
    //         ...(fulfillmentStatus && { 'subOrder.fulfillmentStatus': fulfillmentStatus }),
    //     };

    //     return Order.countDocuments(query);
    // }

    // // -------------------------

    // async findAll({ page = 1, limit = 10, status, paymentStatus, fulfillmentStatus } = {}) {
    //     const query = {
    //         ...(status && { status }),
    //         ...(paymentStatus && { paymentStatus }),
    //         ...(fulfillmentStatus && { 'subOrder.fulfillmentStatus': fulfillmentStatus }),
    //     };

    //     return this._basePopulate(Order.find(query))
    //         .sort({ createdAt: -1 })
    //         .skip((page - 1) * limit)
    //         .limit(limit);
    // }

    // async countAll({ status, paymentStatus, fulfillmentStatus } = {}) {
    //     const query = {
    //         ...(status && { status }),
    //         ...(paymentStatus && { paymentStatus }),
    //         ...(fulfillmentStatus && { 'subOrder.fulfillmentStatus': fulfillmentStatus }),
    //     };
    //     return Order.countDocuments(query);
    // }

    create(data) {
        return new Order(data).save();
    }

    findById(id) {
        if (!mongoose.Types.ObjectId.isValid(id)) return null;
        return Order.findById(id).populate(POPULATE_ITEMS);
    }

    findByOrderNumber(orderNumber) {
        return Order.findOne({ orderNumber }).populate(POPULATE_ITEMS);
    }

    // Used by Stripe webhook to match gateway transaction IDs
    findByGatewayRef(gatewayTransactionId) {
        return Order.findOne({ gatewayTransactionId });
    }

    // ── Payment updates ───────────────────────────────────────────────────────
    updatePaymentStatus(id, paymentStatus, extra = {}) {
        return Order.findByIdAndUpdate(
            id,
            { paymentStatus, ...extra },
            { new: true }
        );
    }

    // ── Global order status (admin) ───────────────────────────────────────────
    updateStatus(id, status, extra = {}) {
        return Order.findByIdAndUpdate(id, { status, ...extra }, { new: true });
    }

    // ── Sub-order fulfillment status (seller) ─────────────────────────────────
    //
    //  MongoDB positional operator ($) targets the first matching array element.
    //  We match by subOrder._id (each sub-document has an auto _id).
    //
    //  🎓 WHY positional $?
    //  Each order has multiple sub-orders (one per seller). We only want to
    //  update the specific seller's sub-order, not all of them.
    async updateSubOrderFulfillment(orderId, subOrderId, update) {
        return Order.findOneAndUpdate(
            { _id: orderId, 'subOrder._id': subOrderId },
            {
                $set: Object.fromEntries(
                    Object.entries(update).map(([k, v]) => [`subOrder.$.${k}`, v])
                ),
            },
            { new: true }
        ).populate(POPULATE_ITEMS);
    }

    // ── Seller queries ────────────────────────────────────────────────────────
    async findBySellerId(sellerId, { page = 1, limit = 10, status, fulfillmentStatus, search } = {}) {
        const sellerObjectId = new mongoose.Types.ObjectId(sellerId);
        const query = { 'subOrder.sellerId': sellerObjectId };
        if (status)            query.status = status;
        if (fulfillmentStatus) query['subOrder.fulfillmentStatus'] = fulfillmentStatus;
        if (search)            query.orderNumber = { $regex: search, $options: 'i' };

        return Order.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate(POPULATE_ITEMS);
    }

    async countBySellerId(sellerId, { status, fulfillmentStatus, search } = {}) {
        const sellerObjectId = new mongoose.Types.ObjectId(sellerId);
        const query = { 'subOrder.sellerId': sellerObjectId };
        if (status)            query.status = status;
        if (fulfillmentStatus) query['subOrder.fulfillmentStatus'] = fulfillmentStatus;
        if (search)            query.orderNumber = { $regex: search, $options: 'i' };
        return Order.countDocuments(query);
    }

    // ── Customer queries ──────────────────────────────────────────────────────
    async findByCustomerId(customerId, { page = 1, limit = 10, status } = {}) {
        const query = { userId: customerId };
        if (status) query.status = status;
        return Order.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate(POPULATE_ITEMS);
    }

    async countByCustomerId(customerId, { status } = {}) {
        const query = { userId: customerId };
        if (status) query.status = status;
        return Order.countDocuments(query);
    }

    findDeliveredOrderByUserAndProduct(userId, productId) {
        return Order.findOne({
            userId,
            subOrder: {
                $elemMatch: {
                    fulfillmentStatus: 'delivered',
                    items: {
                        $elemMatch: {
                            productId,
                        },
                    },
                },
            },
        });
    }

    findOrderByUserAndProduct(userId, productId) {
        return Order.findOne({
            userId,
            subOrder: {
                $elemMatch: {
                    items: {
                        $elemMatch: {
                            productId,
                        },
                    },
                },
            },
        });
    }

    findReviewEligibleOrderByUserAndProduct(userId, productId) {
        return Order.findOne({
            userId,
            $or: [
                {
                    subOrder: {
                        $elemMatch: {
                            fulfillmentStatus: { $in: ['delivered', 'returned'] },
                            items: {
                                $elemMatch: {
                                    productId,
                                },
                            },
                        },
                    },
                },
                {
                    status: 'closed',
                    subOrder: {
                        $elemMatch: {
                            items: {
                                $elemMatch: {
                                    productId,
                                },
                            },
                        },
                    },
                },
            ],
        }).sort({ createdAt: -1 });
    }

    // ── Admin queries ─────────────────────────────────────────────────────────
    async findAll({ page = 1, limit = 10, status, paymentStatus, search } = {}) {
        const query = {};
        if (status)        query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (search)        query.orderNumber = { $regex: search, $options: 'i' };

        return Order.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate(POPULATE_ITEMS);
    }

    async countAll({ status, paymentStatus, search } = {}) {
        const query = {};
        if (status)        query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (search)        query.orderNumber = { $regex: search, $options: 'i' };
        return Order.countDocuments(query);
    }

    // ── Analytics helpers ─────────────────────────────────────────────────────
    async revenueByPeriod(startDate, endDate) {
        return Order.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate }, paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
        ]);
    }
}

export default new OrderRepository();
