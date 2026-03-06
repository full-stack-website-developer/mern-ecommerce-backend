// import orderService from '../services/order.service.js';
// import { asyncHandler } from '../utils/async-handler.util.js';
// import ApiResponse from '../utils/response.util.js';

// // ─────────────────────────────────────────────────────────────────────────────
// //  OrderController
// //  Thin layer: parses HTTP → calls OrderService → formats response.
// //  All business logic lives in the service.
// // ─────────────────────────────────────────────────────────────────────────────

// class OrderController {

//     // ── POST /api/orders ──────────────────────────────────────────────────────
//     //
//     //  Works for all payment methods: cod, stripe, paypal.
//     //  Response shape varies per method:
//     //    COD:    { order }
//     //    Stripe: { order, clientSecret }
//     //    PayPal: { order, paypalOrderId }

//     placeOrder = asyncHandler(async (req, res) => {
//         const {
//             subOrder,
//             shippingAddress,
//             shippingMethod,
//             shippingCost,
//             paymentMethod,
//             couponCode,
//             subtotal,
//             tax,
//             discount,
//             total,
//             guestEmail,
//         } = req.body;

//         const userId = req.user?.id ?? null;

//         const result = await orderService.placeOrder({
//             subOrder,
//             shippingAddress,
//             shippingMethod,
//             shippingCost,
//             paymentMethod,
//             couponCode,
//             subtotal,
//             tax,
//             discount,
//             total,
//             userId,
//             guestEmail,
//         });

//         return ApiResponse.success(res, result, 'Order placed successfully', 201);
//     });

//     // ── GET /api/orders/:id ───────────────────────────────────────────────────

//     getOrderById = asyncHandler(async (req, res) => {
//         const order = await orderService.getOrderById(req.params.id, req.user ?? null);
//         return ApiResponse.success(res, { order }, 'Order fetched successfully');
//     });

//     // ── GET /api/orders ───────────────────────────────────────────────────────

//     getSellerOrders = asyncHandler(async (req, res) => {
//         const { page = 1, limit = 10 } = req.query;
//         const result = await orderService.getUserOrders(req.user.id, {
//             page:  Number(page),
//             limit: Number(limit),
//         });
//         return ApiResponse.success(res, result, 'Orders fetched successfully');
//     });

//     getOrders = asyncHandler(async (req, res) => {
//         const { page = 1, limit = 10, status, paymentStatus, fulfillmentStatus } = req.query;
//         const result = await orderService.getOrders({
//             user: req.user,
//             page:  Number(page),
//             limit: Number(limit),
//             status,
//             paymentStatus,
//             fulfillmentStatus,
//         });

//         return ApiResponse.success(res, result, 'Orders fetched successfully');
//     });

//     updateFulfillmentStatus = asyncHandler(async (req, res) => {
//         const { status, trackingNumber, carrier, sellerId } = req.body;
//         const order = await orderService.updateFulfillmentStatus({
//             orderId: req.params.id,
//             actor: req.user,
//             sellerId,
//             status,
//             trackingNumber,
//             carrier,
//         });

//         return ApiResponse.success(res, { order }, 'Fulfillment status updated successfully');
//     });

//     updatePaymentStatus = asyncHandler(async (req, res) => {
//         const { paymentStatus } = req.body;
//         const order = await orderService.adminUpdatePaymentStatus({
//             orderId: req.params.id,
//             actor: req.user,
//             paymentStatus,
//         });

//         return ApiResponse.success(res, { order }, 'Payment status updated successfully');
//     });

//     updateOrderStatus = asyncHandler(async (req, res) => {
//         const { status } = req.body;
//         const order = await orderService.adminUpdateOrderStatus({
//             orderId: req.params.id,
//             actor: req.user,
//             status,
//         });

//         return ApiResponse.success(res, { order }, 'Order status updated successfully');
//     });

//     // ── POST /api/payments/stripe/webhook ─────────────────────────────────────
//     //
//     //  🎓 CRITICAL: This endpoint receives RAW request body (Buffer), NOT parsed JSON.
//     //  Stripe computes an HMAC signature over the raw bytes.
//     //  If express.json() parses it first, the bytes change and verification fails.
//     //
//     //  This is why in app.js we register:
//     //    app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }))
//     //  BEFORE the normal express.json() middleware.

//     stripeWebhook = asyncHandler(async (req, res) => {
//         const signature = req.headers['stripe-signature'];

//         if (!signature) {
//             return res.status(400).json({ error: 'Missing stripe-signature header' });
//         }

//         // req.body is a Buffer here (raw body), not a parsed object
//         await orderService.handleStripeWebhook(req.body, signature);

//         // Stripe expects a 200 quickly — any non-2xx causes a retry
//         return res.status(200).json({ received: true });
//     });

//     // ── POST /api/payments/paypal/capture/:paypalOrderId ─────────────────────
//     //
//     //  Called by the frontend after the buyer approves in the PayPal popup.
//     //  Body: { orderId: 'our_internal_order_id' }

//     capturePayPalOrder = asyncHandler(async (req, res) => {
//         const { paypalOrderId } = req.params;
//         const { orderId }       = req.body;

//         if (!orderId) {
//             return res.status(400).json({ error: 'orderId is required in request body' });
//         }

//         const result = await orderService.capturePayPalOrder(paypalOrderId, orderId);
//         return ApiResponse.success(res, result, 'Payment captured successfully');
//     });
// }

// export default new OrderController();


import orderService from '../services/order.service.js';
import { asyncHandler } from '../utils/async-handler.util.js';
import ApiResponse from '../utils/response.util.js';

class OrderController {

    // ── POST /api/orders ──────────────────────────────────────────────────────
    placeOrder = asyncHandler(async (req, res) => {
        const {
            subOrder, shippingAddress, shippingMethod, shippingCost,
            paymentMethod, couponCode, guestEmail,
        } = req.body;

        const userId = req.user?.id ?? null;

        const result = await orderService.placeOrder({
            subOrder, shippingAddress, shippingMethod, shippingCost,
            paymentMethod, couponCode, userId, guestEmail,
        });

        return ApiResponse.success(res, result, 'Order placed successfully', 201);
    });

    // ── GET /api/orders/:id ───────────────────────────────────────────────────
    getOrderById = asyncHandler(async (req, res) => {
        const order = await orderService.getOrderById(req.params.id, req.user);
        return ApiResponse.success(res, { order }, 'Order fetched successfully');
    });

    // ── GET /api/orders ───────────────────────────────────────────────────────
    //  Works for seller, user, and admin based on req.user.role
    getOrders = asyncHandler(async (req, res) => {
        const { page = 1, limit = 10, status, paymentStatus, fulfillmentStatus, search, context } = req.query;
        const result = await orderService.getOrders({
            user:              req.user,
            page:              Number(page),
            limit:             Number(limit),
            status:            status            || undefined,
            search:            search            || undefined,
            context:           context           || undefined,
            paymentStatus:     paymentStatus     || undefined,
            fulfillmentStatus: fulfillmentStatus || undefined,
        });
        return ApiResponse.success(res, result, 'Orders fetched successfully');
    });

    // ── PATCH /api/orders/:orderId/suborders/:subOrderId/fulfillment ──────────
    //  Seller marks their sub-order as packed, shipped, delivered, etc.
    updateFulfillment = asyncHandler(async (req, res) => {
        const { orderId, subOrderId } = req.params;
        const { fulfillmentStatus, trackingNumber, carrier, sellerNote } = req.body;

        if (!fulfillmentStatus) {
            return res.status(400).json({ message: 'fulfillmentStatus is required' });
        }

        const order = await orderService.updateFulfillmentStatus(
            orderId, subOrderId, req.user.sellerId,
            { fulfillmentStatus, trackingNumber, carrier, sellerNote }
        );

        return ApiResponse.success(res, { order }, 'Fulfillment status updated successfully');
    });

    // ── PATCH /api/orders/:id/status ──────────────────────────────────────────
    //  Admin updates global order status or payment status
    adminUpdateOrder = asyncHandler(async (req, res) => {
        const { status, paymentStatus, adminNote } = req.body;
        const order = await orderService.adminUpdateOrderStatus(
            req.params.id, { status, paymentStatus, adminNote }
        );
        return ApiResponse.success(res, { order }, 'Order updated successfully');
    });

    // ── POST /api/payments/stripe/webhook ─────────────────────────────────────
    stripeWebhook = asyncHandler(async (req, res) => {
        const signature = req.headers['stripe-signature'];
        if (!signature) return res.status(400).json({ error: 'Missing stripe-signature header' });
        await orderService.handleStripeWebhook(req.body, signature);
        return res.status(200).json({ received: true });
    });

    // ── POST /api/payments/paypal/capture/:paypalOrderId ─────────────────────
    capturePayPalOrder = asyncHandler(async (req, res) => {
        const { paypalOrderId } = req.params;
        const { orderId }       = req.body;
        if (!orderId) return res.status(400).json({ error: 'orderId is required' });
        const result = await orderService.capturePayPalOrder(paypalOrderId, orderId);
        return ApiResponse.success(res, result, 'Payment captured successfully');
    });
}

export default new OrderController();