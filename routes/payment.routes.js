import express from 'express';
import orderController from '../controllers/order.controller.js';

// ─────────────────────────────────────────────────────────────────────────────
//  Payment Routes  →  /api/payments/...
//
//  These are webhook / callback endpoints that payment gateways call directly.
//  They are separate from order CRUD routes for clarity.
// ─────────────────────────────────────────────────────────────────────────────

const paymentRouter = express.Router();

// ── Stripe ────────────────────────────────────────────────────────────────────
//
//  🎓 CRITICAL: The Stripe webhook route uses express.raw() middleware
//  (registered in app.js BEFORE express.json()) to preserve the raw request body.
//  The signature header that Stripe sends can only be verified against raw bytes.
//  Do NOT add express.json() here — it would break signature verification.

paymentRouter.post('/stripe/webhook', orderController.stripeWebhook);

// ── PayPal ────────────────────────────────────────────────────────────────────
//
//  Called by our own frontend after PayPal popup approval.
//  Body: { orderId: '<our MongoDB order ID>' }

paymentRouter.post('/paypal/capture/:paypalOrderId', orderController.capturePayPalOrder);

export default paymentRouter;