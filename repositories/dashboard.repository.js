import mongoose from 'mongoose';
import AppSetting from '../models/app-setting.model.js';
import Dispute from '../models/dispute.model.js';
import Notification from '../models/notification.model.js';
import ReturnRequest from '../models/return-request.model.js';
import SupportTicket from '../models/support-ticket.model.js';
import WishlistItem from '../models/wishlist-item.model.js';
import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import Variant from '../models/variant.model.js';
import Seller from '../models/seller.model.js';
import User from '../models/user.model.js';
import Address from '../models/address.model.js';

class DashboardRepository {
    createSupportTicket(payload) {
        return SupportTicket.create(payload);
    }

    findSupportTicketsByUser(userId) {
        return SupportTicket.find({ userId }).sort({ createdAt: -1 });
    }

    async findSupportTickets({ status, priority, search } = {}) {
        const query = {};
        if (status && status !== 'undefined') query.status = status;
        if (priority && priority !== 'undefined') query.priority = priority;
        if (search) query.$or = [
            { ticketNumber: { $regex: search, $options: 'i' } },
            { subject: { $regex: search, $options: 'i' } },
        ];

        return await SupportTicket.find(query).populate('userId', 'firstName lastName email').sort({ createdAt: -1 }).lean();
    }

    updateSupportTicket(id, patch) {
        return SupportTicket.findByIdAndUpdate(id, { $set: patch }, { new: true });
    }

    createReturnRequest(payload) {
        return ReturnRequest.create(payload);
    }

    findReturnRequestsByUser(userId) {
        return ReturnRequest.find({ userId })
            .populate('sellerId', 'storeName')
            .populate('disputeId', 'disputeNumber status resolution')
            .sort({ createdAt: -1 });
    }

    findReturnRequestByIdForUser(requestId, userId) {
        return ReturnRequest.findOne({ _id: requestId, userId });
    }

    findReturnRequestsBySeller(sellerId, { status } = {}) {
        const query = { sellerId };
        if (status && status !== 'undefined') query.status = status;
        return ReturnRequest.find(query)
            .populate('userId', 'firstName lastName email')
            .populate('disputeId', 'disputeNumber status resolution')
            .sort({ createdAt: -1 });
    }

    findReturnRequestByIdForSeller(requestId, sellerId) {
        return ReturnRequest.findOne({ _id: requestId, sellerId })
            .populate('userId', 'firstName lastName email')
            .populate('sellerId', 'storeName userId');
    }

    findReturnRequestsForAdmin({ status, isDisputed } = {}) {
        const query = {};
        if (status && status !== 'undefined') query.status = status;
        if (typeof isDisputed === 'boolean') query.isDisputed = isDisputed;
        return ReturnRequest.find(query)
            .populate('userId', 'firstName lastName email')
            .populate('sellerId', 'storeName userId')
            .populate('disputeId', 'disputeNumber status resolution')
            .sort({ createdAt: -1 });
    }

    findReturnRequestById(requestId) {
        return ReturnRequest.findById(requestId)
            .populate('userId', 'firstName lastName email')
            .populate('sellerId', 'storeName userId')
            .populate('disputeId', 'disputeNumber status resolution');
    }

    updateReturnRequest(id, patch) {
        return ReturnRequest.findByIdAndUpdate(id, { $set: patch }, { new: true })
            .populate('userId', 'firstName lastName email')
            .populate('sellerId', 'storeName userId')
            .populate('disputeId', 'disputeNumber status resolution');
    }

    findOrderByRefForUser(orderRef, userId) {
        return Order.findOne({ orderNumber: orderRef, userId })
            .select('_id orderNumber subOrder')
            .lean();
    }

    findSellerById(sellerId) {
        return Seller.findById(sellerId).select('_id userId storeName').lean();
    }

    async getSellerProfileSeed(sellerId) {
        const seller = await Seller.findById(sellerId)
            .select('_id userId storeName storeDescription')
            .populate('userId', 'email phone')
            .lean();

        if (!seller) return null;

        const address = await Address.findOne({ userId: seller.userId?._id || seller.userId, type: 'shop' })
            .select('street city state postalCode country')
            .lean();

        const storeName = String(seller.storeName || '').trim();
        const storeSlug = storeName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        const addressLine = address
            ? [address.street, address.city, address.state, address.postalCode, address.country]
                .filter(Boolean)
                .join(', ')
            : '';

        return {
            storeName,
            storeSlug,
            contactEmail: String(seller.userId?.email || '').trim().toLowerCase(),
            phone: String(seller.userId?.phone || '').trim(),
            businessAddress: addressLine,
            storeDescription: String(seller.storeDescription || '').trim(),
        };
    }

    async getSellerPublicMeta(sellerId) {
        return Seller.findById(sellerId)
            .select('_id storeName logo status createdAt')
            .lean();
    }

    findAdminUserIds() {
        return User.find({ role: 'admin' }).select('_id').lean();
    }

    createNotifications(payloads) {
        if (!payloads?.length) return Promise.resolve([]);
        return Notification.insertMany(payloads, { ordered: false });
    }

    addWishlistItem(payload) {
        return WishlistItem.findOneAndUpdate(
            { userId: payload.userId, productId: payload.productId },
            { $set: payload },
            { new: true, upsert: true }
        );
    }

    removeWishlistItem(userId, productId) {
        return WishlistItem.deleteOne({ userId, productId });
    }

    clearWishlist(userId) {
        return WishlistItem.deleteMany({ userId, saveForLater: false });
    }

    async _attachDisplayPrices(items) {
        const productIds = items
            .map((item) => item?.productId?._id?.toString())
            .filter(Boolean);

        if (productIds.length === 0) return items;

        const variants = await Variant.aggregate([
            {
                $match: {
                    productId: { $in: productIds.map((id) => new mongoose.Types.ObjectId(id)) },
                    isActive: true,
                },
            },
            {
                $group: {
                    _id: '$productId',
                    minPrice: { $min: '$price' },
                },
            },
        ]);

        const minVariantPriceByProductId = new Map(
            variants.map((variant) => [variant._id.toString(), variant.minPrice])
        );

        return items.map((item) => {
            const product = item?.productId;
            const productId = product?._id?.toString();
            if (!productId || !product) return item;

            const hasValidBasePrice = typeof product.price === 'number' && product.price > 0;
            const fallbackVariantPrice = minVariantPriceByProductId.get(productId);

            return {
                ...item,
                productId: {
                    ...product,
                    price: hasValidBasePrice ? product.price : (fallbackVariantPrice ?? product.price ?? 0),
                },
            };
        });
    }

    async findWishlist(userId) {
        const items = await WishlistItem.find({ userId, saveForLater: false }).populate('productId').lean();
        return this._attachDisplayPrices(items);
    }

    async findSavedForLater(userId) {
        const items = await WishlistItem.find({ userId, saveForLater: true }).populate('productId').lean();
        return this._attachDisplayPrices(items);
    }

    clearSavedForLater(userId) {
        return WishlistItem.deleteMany({ userId, saveForLater: true });
    }

    createNotification(payload) {
        return Notification.create(payload);
    }

    findNotificationsByUser(userId) {
        return Notification.find({ userId }).sort({ createdAt: -1 }).limit(100);
    }

    markNotificationRead(id, userId) {
        return Notification.findOneAndUpdate({ _id: id, userId }, { $set: { read: true } }, { new: true });
    }

    markAllNotificationsRead(userId) {
        return Notification.updateMany({ userId, read: false }, { $set: { read: true } });
    }

    getSetting(key, fallback = null) {
        return AppSetting.findOne({ key }).then((doc) => doc?.value ?? fallback);
    }

    setSetting(key, value) {
        return AppSetting.findOneAndUpdate({ key }, { $set: { value } }, { new: true, upsert: true });
    }

    createDispute(payload) {
        return Dispute.create(payload);
    }

    findDisputes({ status } = {}) {
        const query = {};
        if (status) query.status = status;
        return Dispute.find(query)
            .populate('userId', 'firstName lastName email')
            .populate('sellerId', 'storeName')
            .populate('orderId', 'orderNumber')
            .populate('returnRequestId', 'requestNumber status')
            .sort({ createdAt: -1 });
    }

    updateDispute(id, patch) {
        return Dispute.findByIdAndUpdate(id, { $set: patch }, { new: true });
    }

    async getAdminAnalytics(days = 30) {
        const safeDays = Math.min(Math.max(Number(days) || 30, 1), 365);
        const now = new Date();

        const periodStart = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
        periodStart.setDate(periodStart.getDate() - (safeDays - 1));

        const previousPeriodStart = new Date(periodStart);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - safeDays);

        const previousPeriodEnd = new Date(periodStart);

        const [
            currentOrders,
            previousOrders,
            allTimePaidRevenueResult,
            totalOrdersAllTime,
            totalUsers,
            totalProducts,
            activeProducts,
            recentOrdersRaw,
        ] = await Promise.all([
            Order.find({ createdAt: { $gte: periodStart, $lte: now } })
                .select('total status paymentStatus createdAt orderNumber userId guestEmail')
                .sort({ createdAt: 1 })
                .lean(),
            Order.find({ createdAt: { $gte: previousPeriodStart, $lt: previousPeriodEnd } })
                .select('total paymentStatus')
                .lean(),
            Order.aggregate([
                { $match: { paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
            Order.countDocuments({}),
            User.countDocuments({ role: { $ne: 'admin' } }),
            Product.countDocuments({}),
            Product.countDocuments({ status: 'enabled' }),
            Order.find({})
                .select('orderNumber total status paymentStatus createdAt userId guestEmail')
                .populate('userId', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .limit(8)
                .lean(),
        ]);

        const summarizeOrders = (ordersList = []) => {
            const ordersCount = ordersList.length;
            const paidOrders = ordersList.filter((order) => order.paymentStatus === 'paid');
            const paidOrdersCount = paidOrders.length;
            const paidRevenue = paidOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
            const grossRevenue = ordersList.reduce((sum, order) => sum + (Number(order.total) || 0), 0);

            return {
                ordersCount,
                paidOrdersCount,
                paidRevenue,
                grossRevenue,
                averageOrderValue: paidOrdersCount > 0 ? paidRevenue / paidOrdersCount : 0,
                paymentSuccessRate: ordersCount > 0 ? (paidOrdersCount / ordersCount) * 100 : 0,
            };
        };

        const currentSummary = summarizeOrders(currentOrders);
        const previousSummary = summarizeOrders(previousOrders);

        const percentChange = (currentValue, previousValue) => {
            const current = Number(currentValue) || 0;
            const previous = Number(previousValue) || 0;

            if (previous === 0) {
                return current > 0 ? 100 : 0;
            }

            return ((current - previous) / previous) * 100;
        };

        const orderStatusBuckets = ['created', 'confirmed', 'closed', 'cancelled', 'refunded'];
        const orderStatusCounts = orderStatusBuckets.reduce((acc, status) => {
            acc[status] = 0;
            return acc;
        }, {});

        currentOrders.forEach((order) => {
            const status = order?.status || 'created';
            if (!(status in orderStatusCounts)) {
                orderStatusCounts[status] = 0;
            }
            orderStatusCounts[status] += 1;
        });

        const chartMap = new Map();
        for (let i = 0; i < safeDays; i += 1) {
            const date = new Date(periodStart);
            date.setDate(periodStart.getDate() + i);
            const key = date.toISOString().slice(0, 10);
            chartMap.set(key, {
                date: key,
                label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue: 0,
                orders: 0,
                paidOrders: 0,
            });
        }

        currentOrders.forEach((order) => {
            const createdAt = new Date(order.createdAt);
            const key = createdAt.toISOString().slice(0, 10);
            const point = chartMap.get(key);
            if (!point) return;

            point.orders += 1;

            if (order.paymentStatus === 'paid') {
                point.paidOrders += 1;
                point.revenue += Number(order.total) || 0;
            }
        });

        const recentOrders = recentOrdersRaw.map((order) => {
            const firstName = order?.userId?.firstName || '';
            const lastName = order?.userId?.lastName || '';
            const name = `${firstName} ${lastName}`.trim();

            return {
                _id: order._id,
                orderNumber: order.orderNumber,
                total: Number(order.total) || 0,
                status: order.status,
                paymentStatus: order.paymentStatus,
                createdAt: order.createdAt,
                customerName: name || 'Guest',
                customerEmail: order?.userId?.email || order.guestEmail || '',
            };
        });

        const allTimePaidRevenue = Number(allTimePaidRevenueResult?.[0]?.total || 0);

        return {
            rangeDays: safeDays,
            totalSales: currentSummary.paidRevenue,
            orders: currentSummary.ordersCount,
            averageOrderValue: currentSummary.averageOrderValue,
            conversionRate: currentSummary.paymentSuccessRate,
            totals: {
                allTimeRevenue: allTimePaidRevenue,
                allTimeOrders: totalOrdersAllTime,
                users: totalUsers,
                products: totalProducts,
                activeProducts,
            },
            trends: {
                revenuePct: percentChange(currentSummary.paidRevenue, previousSummary.paidRevenue),
                ordersPct: percentChange(currentSummary.ordersCount, previousSummary.ordersCount),
                averageOrderValuePct: percentChange(currentSummary.averageOrderValue, previousSummary.averageOrderValue),
                paymentSuccessRatePct: percentChange(currentSummary.paymentSuccessRate, previousSummary.paymentSuccessRate),
            },
            charts: {
                revenueSeries: Array.from(chartMap.values()),
                orderStatus: Object.entries(orderStatusCounts).map(([status, count]) => ({ status, count })),
            },
            recentOrders,
        };
    }

    async getSellerAnalytics(sellerId, days = 30) {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);

        const [orders, products] = await Promise.all([
            Order.find({
                createdAt: { $gte: fromDate },
                'subOrder.sellerId': sellerId,
            }),
            Product.find({ sellerId }),
        ]);

        let gross = 0;
        let itemCount = 0;
        orders.forEach((order) => {
            order.subOrder.forEach((sub) => {
                if (String(sub.sellerId) === String(sellerId)) {
                    gross += sub.total || 0;
                    itemCount += (sub.items || []).reduce((acc, item) => acc + item.quantity, 0);
                }
            });
        });

        return {
            gross,
            orders: orders.length,
            avgOrderValue: orders.length ? gross / orders.length : 0,
            products: products.length,
            itemCount,
        };
    }

    async getSellerDeliveredEarnings(sellerId) {
        const rows = await Order.aggregate([
            {
                $match: {
                    paymentStatus: 'paid',
                    status: { $nin: ['cancelled', 'refunded'] },
                },
            },
            { $unwind: '$subOrder' },
            {
                $match: {
                    'subOrder.sellerId': new mongoose.Types.ObjectId(sellerId),
                    'subOrder.fulfillmentStatus': 'delivered',
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$subOrder.total' },
                },
            },
        ]);

        return Number(rows?.[0]?.total || 0);
    }

    findSellerProducts(sellerId) {
        return Product.find({ sellerId }).populate('categoryId', 'name').sort({ createdAt: -1 });
    }
}

export default new DashboardRepository();
