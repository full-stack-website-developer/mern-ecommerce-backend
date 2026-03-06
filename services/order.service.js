// import orderRepository from '../repositories/order.repository.js';
// import OrderDto from '../dtos/order.dto.js';
// import stripeService from './stripe.service.js';
// import paypalService from './paypal.service.js';
// import { AppError } from '../utils/errors.util.js';
// import addressRepository from '../repositories/address.repository.js';
// import stockService from './stock.service.js';

// const SHIPPING_COSTS = { standard: 10, express: 20, overnight: 30 };
// const TAX_RATE = 0.10;

// const PAYMENT_METHODS = new Set(['cod', 'stripe', 'paypal']);
// const FULFILLMENT_TRANSITIONS = {
//     unfulfilled: ['packed', 'cancelled'],
//     packed: ['shipped', 'cancelled'],
//     shipped: ['delivered', 'returned'],
//     delivered: ['returned'],
//     returned: [],
//     cancelled: [],
// };

// class OrderService {
//     _deriveGlobalStatus(order) {
//         const states = (order.subOrder || []).map((s) => s.fulfillmentStatus);
//         const allCancelled = states.length > 0 && states.every((s) => s === 'cancelled');
//         const allDone = states.length > 0 && states.every((s) => ['delivered', 'returned', 'cancelled'].includes(s));

//         if (order.paymentStatus === 'refunded') return 'refunded';
//         if (allCancelled) return 'cancelled';
//         if (allDone) return 'closed';
//         if (order.paymentStatus === 'paid') return 'confirmed';
//         return 'created';
//     }

//     _assertFulfillmentTransition(current, next) {
//         const allowed = FULFILLMENT_TRANSITIONS[current] || [];
//         if (!allowed.includes(next)) {
//             throw new AppError(`Invalid fulfillment transition: ${current} -> ${next}`, 400);
//         }
//     }

//     _getSellerSubOrderOrThrow(order, sellerId) {
//         const idx = order.subOrder.findIndex((s) => String(s.sellerId) === String(sellerId));
//         if (idx === -1) throw new AppError('Seller sub-order not found in this order', 404);
//         return { idx, subOrder: order.subOrder[idx] };
//     }

//     async _reserveStockIfNeeded(order) {
//         if (order.stockReserved) return;
//         await stockService.decreaseForOrder(order);
//         order.stockReserved = true;
//         await order.save();
//     }

//     async _restoreStockIfNeeded(order) {
//         if (!order.stockReserved) return;
//         await stockService.restoreForOrder(order);
//         order.stockReserved = false;
//         await order.save();
//     }

//     _assertCanViewOrder(order, user) {
//         if (!user) return;

//         if (user.role === 'admin') return;

//         if (user.role === 'user') {
//             if (!order.userId || String(order.userId._id || order.userId) !== String(user.id)) {
//                 throw new AppError('Not authorized to view this order', 403);
//             }
//             return;
//         }

//         if (user.role === 'seller') {
//             const hasSubOrder = order.subOrder.some((s) => String(s.sellerId) === String(user.sellerId));
//             if (!hasSubOrder) throw new AppError('Not authorized to view this order', 403);
//             return;
//         }

//         throw new AppError('Not authorized to view this order', 403);
//     }

//     async placeOrder({
//         subOrder,
//         shippingAddress,
//         shippingMethod,
//         shippingCost,
//         paymentMethod,
//         couponCode,
//         userId,
//         guestEmail,
//     }) {
//         if (!Array.isArray(subOrder) || subOrder.length === 0) {
//             throw new AppError('Order must have at least one subOrder', 400);
//         }

//         if (!userId && !guestEmail) {
//             throw new AppError('Guest orders require an email address', 400);
//         }

//         if (!shippingAddress?.street || !shippingAddress?.city || !shippingAddress?.country) {
//             throw new AppError('Complete shipping address is required', 400);
//         }

//         if (!PAYMENT_METHODS.has(paymentMethod)) {
//             throw new AppError(`Invalid payment method: ${paymentMethod}`, 400);
//         }

//         let finalAddress = {
//             firstName: shippingAddress.firstName,
//             lastName: shippingAddress.lastName,
//             phone: shippingAddress.phone,
//             street: shippingAddress.street,
//             city: shippingAddress.city,
//             state: shippingAddress.state,
//             country: shippingAddress.country,
//             postalCode: shippingAddress.postalCode || '',
//         };

//         const selectedAddressId = shippingAddress?.selectedAddressId || null;
//         if (selectedAddressId) {
//             const saved = await addressRepository.findById(selectedAddressId);
//             if (!saved) throw new AppError('Saved address not found', 404);

//             finalAddress = {
//                 ...finalAddress,
//                 street: saved.street,
//                 city: saved.city,
//                 state: saved.state,
//                 country: saved.country,
//                 postalCode: saved.postalCode,
//             };
//         }

//         if (!finalAddress.firstName || !finalAddress.phone || !finalAddress.state) {
//             throw new AppError('Complete shipping address is required', 400);
//         }

//         if (Number.isNaN(Number(shippingCost)) || Number(shippingCost) < 0) {
//             throw new AppError('Invalid shipping cost', 400);
//         }

//         if (!['standard', 'express', 'overnight'].includes(shippingMethod)) {
//             throw new AppError('Invalid shipping method', 400);
//         }

//         let savedAddressRecord = null;
//         if (shippingAddress.saveAddress && userId && !selectedAddressId) {
//             savedAddressRecord = await addressRepository.create({
//                 userId,
//                 type: 'shipping',
//                 city: finalAddress.city,
//                 phone: finalAddress.phone,
//                 state: finalAddress.state,
//                 street: finalAddress.street,
//                 country: finalAddress.country,
//                 lastName: finalAddress.lastName,
//                 firstName: finalAddress.firstName,
//                 postalCode: finalAddress.postalCode,
//             });
//         }

//         let orderSubtotal = 0;
//         let orderTax = 0;

//         for (const sellerSubOrder of subOrder) {
//             if (!Array.isArray(sellerSubOrder.items) || sellerSubOrder.items.length === 0) {
//                 throw new AppError('Each subOrder must have at least one item', 400);
//             }

//             let sellerSubtotal = 0;
//             let detectedSellerId = sellerSubOrder.sellerId || null;

//             for (const item of sellerSubOrder.items) {
//                 const snapshot = await stockService._getProductForOrder(item.productId, item.variantId);

//                 if (item.quantity > snapshot.quantity) {
//                     throw new AppError('Requested quantity exceeds stock', 400);
//                 }

//                 if (detectedSellerId && String(detectedSellerId) !== String(snapshot.sellerId)) {
//                     throw new AppError('Sub-order contains items from different sellers', 400);
//                 }

//                 detectedSellerId = snapshot.sellerId;
//                 item.price = snapshot.price;
//                 item.sellerId = snapshot.sellerId;
//                 sellerSubtotal += snapshot.price * item.quantity;
//             }

//             if (!detectedSellerId) {
//                 throw new AppError('Seller information missing for subOrder', 400);
//             }

//             const tax = Number((sellerSubtotal * TAX_RATE).toFixed(2));
//             const total = Number((sellerSubtotal + tax).toFixed(2));

//             sellerSubOrder.sellerId = detectedSellerId;
//             sellerSubOrder.subtotal = sellerSubtotal;
//             sellerSubOrder.tax = tax;
//             sellerSubOrder.total = total;

//             orderSubtotal += sellerSubtotal;
//             orderTax += tax;
//         }

//         const effectiveShippingCost = Number(
//             Number.isFinite(Number(shippingCost))
//                 ? Number(shippingCost)
//                 : SHIPPING_COSTS[shippingMethod] ?? SHIPPING_COSTS.standard
//         );

//         const discount = 0;
//         const total = Number((orderSubtotal + orderTax + effectiveShippingCost - discount).toFixed(2));

//         const order = await orderRepository.create({
//             userId: userId ?? null,
//             guestEmail: userId ? null : guestEmail,
//             subOrder,
//             shippingAddress: finalAddress,
//             savedAddressId: savedAddressRecord?._id ?? selectedAddressId,
//             shippingMethod,
//             shippingCost: effectiveShippingCost,
//             paymentMethod,
//             paymentStatus: 'pending',
//             subtotal: orderSubtotal,
//             tax: orderTax,
//             discount,
//             total,
//             couponCode: couponCode ?? null,
//             status: 'created',
//         });

//         if (paymentMethod === 'cod') {
//             await this._reserveStockIfNeeded(order);
//             return { order: new OrderDto(order) };
//         }

//         if (paymentMethod === 'stripe') {
//             const { clientSecret, paymentIntentId } = await stripeService.createPaymentIntent(order);

//             await orderRepository.updatePaymentStatus(order._id, 'pending', {
//                 gatewayTransactionId: paymentIntentId,
//             });

//             return { order: new OrderDto(order), clientSecret };
//         }

//         if (paymentMethod === 'paypal') {
//             const { paypalOrderId } = await paypalService.createOrder(order);
//             return { order: new OrderDto(order), paypalOrderId };
//         }

//         throw new AppError('Unsupported payment method', 400);
//     }

//     async handleStripeWebhook(rawBody, signatureHeader) {
//         const event = stripeService.constructWebhookEvent(rawBody, signatureHeader);

//         switch (event.type) {
//             case 'payment_intent.succeeded': {
//                 const pi = event.data.object;
//                 const order = await orderRepository.findByGatewayRef(pi.id);

//                 if (!order) break;

//                 if (order.paymentStatus !== 'paid') {
//                     await this._reserveStockIfNeeded(order);
//                     order.paymentStatus = 'paid';
//                     order.gatewayResponse = pi;
//                     order.status = this._deriveGlobalStatus(order);
//                     await order.save();
//                 }
//                 break;
//             }

//             case 'charge.succeeded': {
//                 const charge = event.data.object;
//                 const paymentIntentId = charge.payment_intent;
//                 if (!paymentIntentId) break;

//                 const order = await orderRepository.findByGatewayRef(paymentIntentId);
//                 if (!order) break;

//                 if (order.paymentStatus !== 'paid') {
//                     await this._reserveStockIfNeeded(order);
//                     order.paymentStatus = 'paid';
//                     order.gatewayResponse = charge;
//                     order.status = this._deriveGlobalStatus(order);
//                     await order.save();
//                 }
//                 break;
//             }

//             case 'payment_intent.payment_failed': {
//                 const pi = event.data.object;
//                 const order = await orderRepository.findByGatewayRef(pi.id);

//                 if (order && order.paymentStatus !== 'paid') {
//                     order.paymentStatus = 'failed';
//                     order.gatewayResponse = pi;
//                     order.status = this._deriveGlobalStatus(order);
//                     await order.save();
//                 }
//                 break;
//             }

//             default:
//                 break;
//         }

//         return { received: true };
//     }

//     async capturePayPalOrder(paypalOrderId, internalOrderId) {
//         const captureResult = await paypalService.captureOrder(paypalOrderId);

//         if (!captureResult.success) {
//             throw new AppError(`PayPal capture failed: status ${captureResult.status}`, 400);
//         }

//         const order = await orderRepository.findById(internalOrderId);
//         if (!order) throw new AppError('Order not found', 404);

//         await this._reserveStockIfNeeded(order);

//         order.paymentStatus = 'paid';
//         order.gatewayTransactionId = captureResult.transactionId;
//         order.gatewayResponse = captureResult.rawResponse;
//         order.status = this._deriveGlobalStatus(order);
//         await order.save();

//         return { success: true, orderId: order._id, transactionId: captureResult.transactionId };
//     }

//     async getOrderById(orderId, requestingUser) {
//         const order = await orderRepository.findById(orderId);
//         if (!order) throw new AppError('Order not found', 404);

//         this._assertCanViewOrder(order, requestingUser);

//         if (requestingUser?.role === 'seller') {
//             return new OrderDto(order, { sellerId: requestingUser.sellerId });
//         }

//         return new OrderDto(order);
//     }

//     async getUserOrders(userId, options) {
//         const [orders, total] = await Promise.all([
//             orderRepository.findByUserId(userId, options),
//             orderRepository.countByUserId(userId, options),
//         ]);
//         return { orders: orders.map((o) => new OrderDto(o)), total };
//     }

//     async getOrders({ user, page, limit, status, paymentStatus, fulfillmentStatus }) {
//         const { id: userId, role } = user;
//         let orders;
//         let total;

//         const query = {
//             page,
//             limit,
//             status,
//             paymentStatus,
//             fulfillmentStatus,
//         };

//         if (role === 'seller') {
//             [orders, total] = await Promise.all([
//                 orderRepository.findBySellerId(user.sellerId, query),
//                 orderRepository.countBySellerId(user.sellerId, query),
//             ]);
//         } else if (role === 'user') {
//             [orders, total] = await Promise.all([
//                 orderRepository.findByCustomerId(userId, query),
//                 orderRepository.countByCustomerId(userId, query),
//             ]);
//         } else if (role === 'admin') {
//             [orders, total] = await Promise.all([
//                 orderRepository.findAll(query),
//                 orderRepository.countAll(query),
//             ]);
//         } else {
//             throw new AppError('Unauthorized role', 403);
//         }

//         return {
//             orders: orders.map((o) => new OrderDto(o, role === 'seller' ? { sellerId: user.sellerId } : {})),
//             total,
//             page,
//             limit,
//         };
//     }

//     async updateFulfillmentStatus({ orderId, actor, sellerId, status, trackingNumber, carrier }) {
//         if (!['seller', 'admin'].includes(actor.role)) {
//             throw new AppError('Only sellers and admins can update fulfillment', 403);
//         }

//         const order = await orderRepository.findById(orderId);
//         if (!order) throw new AppError('Order not found', 404);

//         const targetSellerId = actor.role === 'seller' ? actor.sellerId : sellerId;
//         if (!targetSellerId) {
//             throw new AppError('sellerId is required for admin fulfillment updates', 400);
//         }

//         const { subOrder } = this._getSellerSubOrderOrThrow(order, targetSellerId);

//         this._assertFulfillmentTransition(subOrder.fulfillmentStatus, status);

//         if (status === 'shipped' && !trackingNumber) {
//             throw new AppError('Tracking number is required when marking as shipped', 400);
//         }

//         subOrder.fulfillmentStatus = status;

//         if (status === 'packed') {
//             subOrder.trackingNumber = subOrder.trackingNumber || null;
//             subOrder.carrier = subOrder.carrier || null;
//         }

//         if (status === 'shipped') {
//             subOrder.trackingNumber = trackingNumber;
//             subOrder.carrier = carrier || subOrder.carrier || null;
//             subOrder.shippedAt = new Date();
//         }

//         if (status === 'delivered') {
//             subOrder.deliveredAt = new Date();
//         }

//         if (status === 'cancelled') {
//             subOrder.trackingNumber = null;
//             subOrder.carrier = null;
//             subOrder.shippedAt = null;
//             subOrder.deliveredAt = null;
//         }

//         order.status = this._deriveGlobalStatus(order);
//         await order.save();

//         return actor.role === 'seller'
//             ? new OrderDto(order, { sellerId: actor.sellerId })
//             : new OrderDto(order);
//     }

//     async adminUpdatePaymentStatus({ orderId, actor, paymentStatus }) {
//         if (actor.role !== 'admin') {
//             throw new AppError('Only admins can update payment status', 403);
//         }

//         if (!['pending', 'paid', 'failed', 'refunded'].includes(paymentStatus)) {
//             throw new AppError('Invalid payment status', 400);
//         }

//         const order = await orderRepository.findById(orderId);
//         if (!order) throw new AppError('Order not found', 404);

//         const previous = order.paymentStatus;

//         if (paymentStatus === 'paid') {
//             await this._reserveStockIfNeeded(order);
//         }

//         if (paymentStatus === 'refunded') {
//             await this._restoreStockIfNeeded(order);
//         }

//         if (previous === 'refunded' && paymentStatus !== 'refunded') {
//             throw new AppError('Refunded orders cannot move to another payment state', 400);
//         }

//         order.paymentStatus = paymentStatus;
//         order.status = this._deriveGlobalStatus(order);
//         await order.save();

//         return new OrderDto(order);
//     }

//     async adminUpdateOrderStatus({ orderId, actor, status }) {
//         if (actor.role !== 'admin') {
//             throw new AppError('Only admins can update order status', 403);
//         }

//         if (!['created', 'confirmed', 'cancelled', 'refunded', 'closed'].includes(status)) {
//             throw new AppError('Invalid order status', 400);
//         }

//         const order = await orderRepository.findById(orderId);
//         if (!order) throw new AppError('Order not found', 404);

//         if (status === 'confirmed' && order.paymentStatus !== 'paid') {
//             throw new AppError('Only paid orders can be confirmed', 400);
//         }

//         if (status === 'cancelled') {
//             const hasDelivered = order.subOrder.some((s) => ['delivered', 'returned'].includes(s.fulfillmentStatus));
//             if (hasDelivered) {
//                 throw new AppError('Delivered/returned orders cannot be globally cancelled', 400);
//             }
//             for (const sub of order.subOrder) {
//                 sub.fulfillmentStatus = 'cancelled';
//                 sub.trackingNumber = null;
//                 sub.carrier = null;
//                 sub.shippedAt = null;
//                 sub.deliveredAt = null;
//             }
//             await this._restoreStockIfNeeded(order);
//         }

//         if (status === 'refunded') {
//             order.paymentStatus = 'refunded';
//             await this._restoreStockIfNeeded(order);
//         }

//         if (status === 'created' && order.paymentStatus === 'paid') {
//             throw new AppError('Paid orders cannot move back to created', 400);
//         }

//         order.status = status;
//         await order.save();

//         return new OrderDto(order);
//     }
// }

// export default new OrderService();

import orderRepository from '../repositories/order.repository.js';
import OrderDto from '../dtos/order.dto.js';
import stripeService from './stripe.service.js';
import paypalService from './paypal.service.js';
import { AppError } from '../utils/errors.util.js';
import addressRepository from '../repositories/address.repository.js';
import stockService from './stock.service.js';
import couponService from './coupon.service.js';
import dashboardRepository from '../repositories/dashboard.repository.js';
import {
    sendOrderCancelledMail,
    sendOrderConfirmationMail,
    sendOrderDeliveredMail,
    sendOrderShippedMail,
} from '../email/send-order-mail.js';

const PLATFORM_DEFAULTS = {
    gateway: 'stripe',
    currency: 'USD',
    defaultShippingCost: 10,
    freeShippingThreshold: 100,
    taxRate: 10,
    siteName: 'Ecommerce',
    supportEmail: '',
    supportPhone: '',
};

// ── Allowed fulfillment transitions (per seller) ──────────────────────────────
//  Seller can only advance forward, never skip or go back.
const ALLOWED_TRANSITIONS = {
    unfulfilled: ['packed', 'cancelled'],
    packed:      ['shipped', 'cancelled'],
    shipped:     ['delivered'],
    delivered:   [],
    cancelled:   [],
    returned:    [],
};

class OrderService {
    async _getPlatformSettings() {
        return dashboardRepository.getSetting('admin:platform', PLATFORM_DEFAULTS);
    }

    _getShippingCost(shippingMethod, subtotal, platform = PLATFORM_DEFAULTS) {
        const base = Number(platform.defaultShippingCost || 0);
        const freeThreshold = Number(platform.freeShippingThreshold || 0);

        if (freeThreshold > 0 && subtotal >= freeThreshold) return 0;

        const method = shippingMethod || 'standard';
        const multipliers = { standard: 1, express: 2, overnight: 3 };
        const multiplier = multipliers[method] ?? 1;
        return Number((base * multiplier).toFixed(2));
    }

    _resolveOrderEmail(order) {
        if (order?.userId?.email) return order.userId.email;
        if (typeof order?.userId?.email === 'string') return order.userId.email;
        return order?.guestEmail || null;
    }

    _buildOrderItems(order) {
        const items = [];

        for (const subOrder of order?.subOrder || []) {
            for (const item of subOrder?.items || []) {
                const productName = item?.productId?.name || `Product ${item?.productId?._id || item?.productId || ''}`.trim();
                const quantity = Number(item?.quantity) || 0;
                const price = Number(item?.price) || 0;
                items.push({
                    name: productName,
                    quantity,
                    price,
                    subtotal: quantity * price,
                });
            }
        }

        return items;
    }

    async _sendOrderConfirmationEmail(orderId) {
        try {
            const order = await orderRepository.findById(orderId);
            if (!order) return;

            const to = this._resolveOrderEmail(order);
            if (!to) return;

            await sendOrderConfirmationMail({
                to,
                orderNumber: order.orderNumber,
                items: this._buildOrderItems(order),
                total: order.total,
                shippingAddress: order.shippingAddress,
                paymentMethod: order.paymentMethod,
            });
        } catch (error) {
            console.error('Order confirmation email failed:', error?.message || error);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  placeOrder — called for all payment methods
    // ─────────────────────────────────────────────────────────────────────────
    async placeOrder({
        subOrder,
        shippingAddress,
        shippingMethod,
        shippingCost: _shippingCost, // ignored intentionally, totals are always server-calculated
        paymentMethod,
        couponCode,
        userId,
        guestEmail
    }) {
        if (!Array.isArray(subOrder) || subOrder.length === 0)
            throw new AppError('Order must have at least one subOrder', 400);

        if (!userId && !guestEmail)
            throw new AppError('Guest orders require an email address', 400);

        if (!shippingAddress?.street || !shippingAddress?.city || !shippingAddress?.country)
            throw new AppError('Complete shipping address is required', 400);

        const validMethods = ['cod', 'stripe', 'paypal'];
        if (!validMethods.includes(paymentMethod))
            throw new AppError(`Invalid payment method: ${paymentMethod}`, 400);

        const validShippingMethods = ['standard', 'express', 'overnight'];
        const normalizedShippingMethod = validShippingMethods.includes(shippingMethod) ? shippingMethod : 'standard';

        // ── Build final address (let is required — may be reassigned below) ──
        let finalAddress = {
            firstName:  shippingAddress.firstName,
            lastName:   shippingAddress.lastName  ?? '',
            phone:      shippingAddress.phone,
            street:     shippingAddress.street,
            city:       shippingAddress.city,
            state:      shippingAddress.state,
            country:    shippingAddress.country   ?? 'Pakistan',
            postalCode: shippingAddress.postalCode ?? '',
        };

        // Optionally load a saved address by ID
        if (shippingAddress?.selectedAddressId) {
            const saved = await addressRepository.findById(shippingAddress.selectedAddressId);
            if (!saved) throw new AppError('Saved address not found', 404);
            finalAddress = {
                ...finalAddress,
                street:     saved.street,
                city:       saved.city,
                state:      saved.state,
                country:    saved.country,
                postalCode: saved.postalCode ?? '',
            };
        }

        // Save address if requested by a logged-in user (and not using an existing one)
        if (shippingAddress.saveAddress && userId && !shippingAddress?.selectedAddressId) {
            await addressRepository.create({
                userId,
                type:       'shipping',
                city:       finalAddress.city,
                phone:      finalAddress.phone,
                state:      finalAddress.state,
                street:     finalAddress.street,
                country:    finalAddress.country,
                lastName:   finalAddress.lastName,
                firstName:  finalAddress.firstName,
                postalCode: finalAddress.postalCode,
            });
        }

        // ── Price all sub-orders server-side (never trust frontend prices) ──
        let orderSubtotal = 0;
        let orderTax      = 0;

        for (const s of subOrder) {
            if (!Array.isArray(s.items) || s.items.length === 0)
                throw new AppError('Each subOrder must have at least one item', 400);

            let sellerSubtotal = 0;

            for (const item of s.items) {
                const snapshot = await stockService._getProductForOrder(item.productId, item.variantId);

                if (item.quantity > snapshot.quantity)
                    throw new AppError('Requested quantity exceeds stock', 400);

                // Overwrite with server-side price (prevents price tampering)
                item.price    = snapshot.price;
                item.sellerId = snapshot.sellerId;
                sellerSubtotal += snapshot.price * item.quantity;
            }

            s.subtotal  = sellerSubtotal;
            s.tax       = 0;
            s.total     = sellerSubtotal;
            orderSubtotal += sellerSubtotal;
        }

        const platform = await this._getPlatformSettings();
        const taxRate = Number(platform.taxRate || 0) / 100;
        orderTax = parseFloat((orderSubtotal * taxRate).toFixed(2));

        for (const s of subOrder) {
            s.tax = parseFloat((s.subtotal * taxRate).toFixed(2));
            s.total = parseFloat((s.subtotal + s.tax).toFixed(2));
        }

        const resolvedShippingCost = this._getShippingCost(normalizedShippingMethod, orderSubtotal, platform);
        const { coupon, discountAmount } = await couponService.validateAndComputeDiscount(couponCode, orderSubtotal);
        const discount = parseFloat(Number(discountAmount || 0).toFixed(2));
        const total    = parseFloat((orderSubtotal + orderTax + resolvedShippingCost - discount).toFixed(2));

        const order = await orderRepository.create({
            userId:          userId ?? null,
            guestEmail:      userId ? null : guestEmail,
            subOrder,
            shippingAddress: finalAddress,
            shippingMethod:  normalizedShippingMethod,
            shippingCost:    resolvedShippingCost,
            paymentMethod,
            paymentStatus:   'pending',
            subtotal:        orderSubtotal,
            tax:             orderTax,
            discount,
            total,
            couponCode:      coupon?.code ?? null,
            // 'created' = waiting for payment confirmation (stripe/paypal)
            // COD orders jump straight to 'confirmed' below
            status: 'created',
        });

        void this._sendOrderConfirmationEmail(order._id);

        // ── Payment method branching ──────────────────────────────────────────
        if (paymentMethod === 'cod') {
            // COD: stock decreases immediately, order is confirmed
            await stockService.decreaseForOrder(order);
            if (coupon?.code) await couponService.incrementUsage(coupon.code);
            const confirmedOrder = await orderRepository.updateStatus(order._id, 'confirmed');
            return { order: new OrderDto(confirmedOrder) };
        }

        if (paymentMethod === 'stripe') {
            const { clientSecret, paymentIntentId } = await stripeService.createPaymentIntent(order);
            await orderRepository.updatePaymentStatus(order._id, 'pending', {
                gatewayTransactionId: paymentIntentId,
            });
            return { order: new OrderDto(order), clientSecret };
        }

        if (paymentMethod === 'paypal') {
            const { paypalOrderId } = await paypalService.createOrder(order);
            return { order: new OrderDto(order), paypalOrderId };
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Stripe Webhook
    // ─────────────────────────────────────────────────────────────────────────
    async handleStripeWebhook(rawBody, signatureHeader) {
        const event = stripeService.constructWebhookEvent(rawBody, signatureHeader);
        console.log(`[Stripe Webhook] Received event: ${event.type}`);

        switch (event.type) {
            case 'payment_intent.succeeded': {
                const pi    = event.data.object;
                const order = await orderRepository.findByGatewayRef(pi.id);
                if (!order) break;

                if (order.paymentStatus !== 'paid') {
                    await stockService.decreaseForOrder(order);
                    await orderRepository.updatePaymentStatus(order._id, 'paid', {
                        gatewayResponse: pi,
                        status: 'confirmed',
                    });
                    if (order.couponCode) await couponService.incrementUsage(order.couponCode);
                    console.log(`[Stripe] ✅ Order ${order.orderNumber} confirmed via PI.succeeded`);
                }
                break;
            }

            case 'charge.succeeded': {
                const charge          = event.data.object;
                const paymentIntentId = charge.payment_intent;
                if (!paymentIntentId) break;

                const order = await orderRepository.findByGatewayRef(paymentIntentId);
                if (!order) { console.warn(`[Stripe] No order for PI: ${paymentIntentId}`); break; }

                if (order.paymentStatus !== 'paid') {
                    await stockService.decreaseForOrder(order);
                    await orderRepository.updatePaymentStatus(order._id, 'paid', {
                        gatewayResponse: charge,
                        status: 'confirmed',
                    });
                    if (order.couponCode) await couponService.incrementUsage(order.couponCode);
                    console.log(`[Stripe] ✅ Order ${order.orderNumber} confirmed via charge.succeeded`);
                }
                break;
            }

            case 'payment_intent.payment_failed': {
                const pi    = event.data.object;
                const order = await orderRepository.findByGatewayRef(pi.id);
                if (order) {
                    await orderRepository.updatePaymentStatus(order._id, 'failed', { gatewayResponse: pi });
                    console.log(`[Stripe] ❌ Order ${order.orderNumber} FAILED`);
                }
                break;
            }

            default:
                console.log(`[Stripe] Unhandled event: ${event.type}`);
        }

        return { received: true };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PayPal Capture
    // ─────────────────────────────────────────────────────────────────────────
    async capturePayPalOrder(paypalOrderId, internalOrderId) {
        const captureResult = await paypalService.captureOrder(paypalOrderId);
        if (!captureResult.success)
            throw new AppError(`PayPal capture failed: status ${captureResult.status}`, 400);

        const order = await orderRepository.findById(internalOrderId);
        if (!order) throw new AppError('Order not found', 404);

        if (order.paymentStatus !== 'paid') {
            await stockService.decreaseForOrder(order);
            await orderRepository.updatePaymentStatus(order._id, 'paid', {
                gatewayTransactionId: captureResult.transactionId,
                gatewayResponse:      captureResult.rawResponse,
                status:               'confirmed',
            });
            if (order.couponCode) await couponService.incrementUsage(order.couponCode);
        }

        return { success: true, orderId: order._id, transactionId: captureResult.transactionId };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Seller: Update fulfillment status for their sub-order
    //
    //  🎓 WHY validate transitions?
    //  Without guards, a seller could skip "packed" → jump to "shipped",
    //  or accidentally mark "delivered" before shipping. The state machine
    //  ensures a proper, auditable trail.
    // ─────────────────────────────────────────────────────────────────────────
    async updateFulfillmentStatus(orderId, subOrderId, sellerId, { fulfillmentStatus, trackingNumber, carrier, sellerNote }) {
        const order = await orderRepository.findById(orderId);
        if (!order) throw new AppError('Order not found', 404);

        if (order.status === 'cancelled' || order.status === 'refunded')
            throw new AppError('Cannot update a cancelled or refunded order', 400);

        // Find the sub-order that belongs to this seller
        const subOrder = order.subOrder.find(
            s => String(s._id) === String(subOrderId) &&
                 String(s.sellerId?._id ?? s.sellerId) === String(sellerId)
        );

        if (!subOrder) throw new AppError('Sub-order not found or not yours', 404);

        const current = subOrder.fulfillmentStatus;
        const allowed = ALLOWED_TRANSITIONS[current] ?? [];

        if (!allowed.includes(fulfillmentStatus))
            throw new AppError(
                `Cannot transition from '${current}' to '${fulfillmentStatus}'. Allowed: ${allowed.join(', ') || 'none'}`,
                400
            );

        const update = { fulfillmentStatus };

        if (fulfillmentStatus === 'shipped') {
            if (!trackingNumber) throw new AppError('Tracking number is required when marking shipped', 400);
            update.trackingNumber = trackingNumber;
            update.carrier        = carrier ?? null;
            update.shippedAt      = new Date();
        }

        if (fulfillmentStatus === 'delivered') {
            update.deliveredAt = new Date();
        }

        if (sellerNote !== undefined) update.sellerNote = sellerNote;

        let updated = await orderRepository.updateSubOrderFulfillment(orderId, subOrderId, update);

        const recipientEmail = this._resolveOrderEmail(updated);
        const updatedSubOrder = updated.subOrder?.find(
            (s) => String(s._id) === String(subOrderId)
        );

        if (recipientEmail && fulfillmentStatus === 'shipped') {
            try {
                await sendOrderShippedMail({
                    to: recipientEmail,
                    orderNumber: updated.orderNumber,
                    trackingNumber: updatedSubOrder?.trackingNumber,
                    carrier: updatedSubOrder?.carrier,
                    sellerName: updatedSubOrder?.sellerId?.businessName || 'Marketplace Seller',
                });
            } catch (error) {
                console.error('Order shipped email failed:', error?.message || error);
            }
        }

        if (recipientEmail && fulfillmentStatus === 'delivered') {
            try {
                await sendOrderDeliveredMail({
                    to: recipientEmail,
                    orderNumber: updated.orderNumber,
                });
            } catch (error) {
                console.error('Order delivered email failed:', error?.message || error);
            }
        }

        // ── Auto-close order if ALL sub-orders are delivered ─────────────────
        const allDelivered = updated.subOrder.every(s => s.fulfillmentStatus === 'delivered');
        if (allDelivered) {
            updated = await orderRepository.updateStatus(orderId, 'closed');
        }

        return new OrderDto(updated, { sellerId });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Admin: Confirm, cancel, mark COD paid, refund
    // ─────────────────────────────────────────────────────────────────────────
    async adminUpdateOrderStatus(orderId, { status, paymentStatus, adminNote }) {
        const order = await orderRepository.findById(orderId);
        if (!order) throw new AppError('Order not found', 404);

        const update = {};

        if (status) {
            const validTransitions = {
                created:   ['confirmed', 'cancelled'],
                confirmed: ['cancelled', 'closed'],
                cancelled: [],
                refunded:  [],
                closed:    [],
            };
            const allowed = validTransitions[order.status] ?? [];
            if (!allowed.includes(status))
                throw new AppError(`Cannot transition order from '${order.status}' to '${status}'`, 400);

            update.status = status;

            // If cancelled, restore stock
            if (status === 'cancelled') {
                await stockService.restoreForOrder(order);
            }
        }

        if (paymentStatus) {
            const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
            if (!validPaymentStatuses.includes(paymentStatus))
                throw new AppError(`Invalid payment status: ${paymentStatus}`, 400);
            update.paymentStatus = paymentStatus;

            // If COD marked paid: also confirm the order
            if (paymentStatus === 'paid' && order.paymentMethod === 'cod' && order.status === 'created') {
                update.status = 'confirmed';
            }

            // If refunded: also update order status
            if (paymentStatus === 'refunded') {
                update.status = 'refunded';
                await stockService.restoreForOrder(order);
            }
        }

        if (adminNote !== undefined) update.adminNote = adminNote;

        const updated = await orderRepository.updateStatus(orderId, update.status ?? order.status, update);

        if (update.status === 'cancelled') {
            const recipientEmail = this._resolveOrderEmail(updated);
            if (recipientEmail) {
                try {
                    await sendOrderCancelledMail({
                        to: recipientEmail,
                        orderNumber: updated.orderNumber,
                        reason: update.adminNote || 'Cancelled by admin',
                    });
                } catch (error) {
                    console.error('Order cancelled email failed:', error?.message || error);
                }
            }
        }

        return new OrderDto(updated, { role: 'admin' });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Get single order (with role-based access)
    // ─────────────────────────────────────────────────────────────────────────
    async getOrderById(orderId, requestingUser) {
        const order = await orderRepository.findById(orderId);
        if (!order) throw new AppError('Order not found', 404);

        const { id: userId, role, sellerId } = requestingUser ?? {};

        if (role === 'admin') {
            return new OrderDto(order, { role: 'admin' });
        }

        if (role === 'seller') {
            const hasSub = order.subOrder.some(
                s => String(s.sellerId?._id ?? s.sellerId) === String(sellerId)
            );
            if (!hasSub) throw new AppError('Not authorized to view this order', 403);
            return new OrderDto(order, { sellerId });
        }

        // Customer or guest
        if (userId && order.userId && order.userId._id?.toString() !== userId) {
            throw new AppError('Not authorized to view this order', 403);
        }

        return new OrderDto(order);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  List orders (role-aware)
    // ─────────────────────────────────────────────────────────────────────────
    async getOrders({ user, page = 1, limit = 10, status, paymentStatus, fulfillmentStatus, search, context }) {
        const { id: userId, role, sellerId } = user;
        let orders, total;

        if (context === 'seller') {
            [orders, total] = await Promise.all([
                orderRepository.findBySellerId(sellerId, { page, limit, status, fulfillmentStatus, search }),
                orderRepository.countBySellerId(sellerId, { status, fulfillmentStatus, search }),
            ]);
        } else if (context === 'user') {
            [orders, total] = await Promise.all([
                orderRepository.findByCustomerId(userId, { page, limit, status }),
                orderRepository.countByCustomerId(userId, { status }),
            ]);
        } else if (context === 'admin') {
            [orders, total] = await Promise.all([
                orderRepository.findAll({ page, limit, status, paymentStatus, search }),
                orderRepository.countAll({ status, paymentStatus, search }),
            ]);
        } else {
            throw new AppError('Unauthorized role', 403);
        }

        const dtoOptions = role === 'seller' ? { sellerId } : role === 'admin' ? { role: 'admin' } : {};

        return {
            orders: orders.map(o => new OrderDto(o, dtoOptions)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
}

export default new OrderService();
