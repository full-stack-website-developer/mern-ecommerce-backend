// import express from 'express';
// import orderController from '../controllers/order.controller.js';
// import { authenticateToken, authorize, optionalAuth } from '../middleware/auth.middleware.js';

// const orderRouter = express.Router();

// // ── Order CRUD ────────────────────────────────────────────────────────────────

// // Place order — works for guest (no token) and logged-in user
// orderRouter.post('/',    optionalAuth,      orderController.placeOrder);

// // Get single order — optionalAuth (guests access via link from email)
// orderRouter.get('/:id',  optionalAuth,      orderController.getOrderById);

// // Get my orders — must be logged in
// // orderRouter.get('/',     authenticateToken, orderController.getUserOrders);

// orderRouter.get(
//   '/',
//   authenticateToken,
//   authorize('user', 'seller', 'admin'),
//   orderController.getOrders
// );

// orderRouter.patch(
//   '/:id/fulfillment',
//   authenticateToken,
//   authorize('seller', 'admin'),
//   orderController.updateFulfillmentStatus
// );

// orderRouter.patch(
//   '/:id/payment-status',
//   authenticateToken,
//   authorize('admin'),
//   orderController.updatePaymentStatus
// );

// orderRouter.patch(
//   '/:id/status',
//   authenticateToken,
//   authorize('admin'),
//   orderController.updateOrderStatus
// );

// export default orderRouter;

import express from 'express';
import orderController from '../controllers/order.controller.js';
import { authenticateToken, authorize, optionalAuth, requireApprovedSeller } from '../middleware/auth.middleware.js';

const orderRouter = express.Router();

// ── Place order (guest or logged-in user) ─────────────────────────────────────
orderRouter.post('/', optionalAuth, orderController.placeOrder);

// ── Get single order ─────────────────────────────────────────────────────────
//  optionalAuth: guests access via email-linked URL; logged-in users get auth check
orderRouter.get('/:id', optionalAuth, orderController.getOrderById);

// ── List orders ───────────────────────────────────────────────────────────────
//  Same endpoint, different behavior per role:
//    seller → their sub-orders only
//    user   → their orders
//    admin  → all orders with filters
orderRouter.get(
    '/',
    authenticateToken,
    authorize('seller', 'user', 'admin'),
    orderController.getOrders
);

// ── Seller: update sub-order fulfillment status ───────────────────────────────
//  PATCH /api/orders/:orderId/suborders/:subOrderId/fulfillment
//  Body: { fulfillmentStatus, trackingNumber?, carrier?, sellerNote? }
orderRouter.patch(
    '/:orderId/suborders/:subOrderId/fulfillment',
    authenticateToken,
    authorize('seller'),
    requireApprovedSeller,
    orderController.updateFulfillment
);

// ── Admin: update global order / payment status ───────────────────────────────
//  PATCH /api/orders/:id/status
//  Body: { status?, paymentStatus?, adminNote? }
orderRouter.patch(
    '/:id/status',
    authenticateToken,
    authorize('admin'),
    orderController.adminUpdateOrder
);

export default orderRouter;
