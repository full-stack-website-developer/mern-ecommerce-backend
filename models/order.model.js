import mongoose, { Schema } from 'mongoose';
import Counter from './counter.model.js';

// ─── Embedded schemas ────────────────────────────────────────────────────────

const orderItemSchema = new Schema({
    productId:  { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId:  { type: Schema.Types.ObjectId, ref: 'Variant', default: null },
    sellerId:   { type: Schema.Types.ObjectId, ref: 'Seller', default: null },
    quantity:   { type: Number, required: true, min: 1 },
    price:      { type: Number, required: true, min: 0 },
}, { _id: false });

const addressSchema = new Schema({
    firstName:  { type: String, required: true },
    lastName:   { type: String, default: '' },
    phone:      { type: String, required: true },
    street:     { type: String, required: true },
    city:       { type: String, required: true },
    state:      { type: String, required: true },
    postalCode: { type: String, default: '' },
    country:    { type: String, required: true, default: 'Pakistan' },
}, { _id: false });

// ─── Main Order schema ────────────────────────────────────────────────────────

const orderSchema = new Schema({
    orderNumber: { type: String, unique: true },

    // Guest OR logged-in user — one of these will always be set
    userId:     { type: Schema.Types.ObjectId, ref: 'User', default: null },
    guestEmail: { type: String, default: null },

    subOrder: {
        type: [
            {
                sellerId: { type: Schema.Types.ObjectId, ref: 'Seller', default: null },
                subtotal: { type: Number, required: true },
                tax:      { type: Number, default: 0 },
                total:    { type: Number, required: true },
                trackingNumber: { type: String, default: null },
                carrier:        { type: String, default: null },
                shippedAt:      { type: Date, default: null },
                deliveredAt:    { type: Date, default: null },
                sellerNote:     { type: String, default: null },

                // ── Seller-level fulfillment lifecycle ──────────────────────
                // unfulfilled → packed → shipped → delivered | returned | cancelled
                fulfillmentStatus: {
                    type: String,
                    enum: ['unfulfilled', 'packed', 'shipped', 'delivered', 'returned', 'cancelled'],
                    default: 'unfulfilled',
                },

                items: {
                    type: [orderItemSchema],
                    validate: v => v.length > 0,
                    required: true
                },
            },
        ],
        validate: v => v.length > 0
    },

    shippingAddress: { type: addressSchema, required: true },

    shippingMethod: {
        type: String,
        enum: ['standard', 'express', 'overnight'],
        default: 'standard',
    },
    shippingCost: { type: Number, required: true },

    paymentMethod: {
        type: String,
        // cod     → Cash collected on delivery
        // stripe  → Card payment via Stripe Payment Intents
        // paypal  → PayPal checkout
        enum: ['cod', 'stripe', 'paypal'],
        required: true,
    },

    // ── Payment status lifecycle ──────────────────────────────────────────────
    // cod     → 'pending' until driver collects cash → admin marks 'paid'
    // stripe  → 'pending' → 'paid' after webhook
    // paypal  → 'pending' → 'paid' after capture
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending',
    },

    gatewayTransactionId: { type: String, default: null },
    gatewayResponse:      { type: Schema.Types.Mixed, default: null },

    // ── Pricing ───────────────────────────────────────────────────────────────
    subtotal:   { type: Number, required: true },
    tax:        { type: Number, required: true },
    discount:   { type: Number, default: 0 },
    total:      { type: Number, required: true },
    couponCode: { type: String, default: null },

    // ── Global order lifecycle ─────────────────────────────────────────────────
    // created   → order placed, payment not yet confirmed (stripe/paypal pending)
    // confirmed → payment confirmed (or COD accepted)
    // cancelled → admin/customer cancelled before fulfilment
    // refunded  → payment reversed
    // closed    → all sub-orders delivered, order complete
    status: {
        type: String,
        enum: ['created', 'confirmed', 'cancelled', 'refunded', 'closed'],
        default: 'created',
    },

    // Admin notes (e.g. why it was cancelled/refunded)
    adminNote: { type: String, default: null },
    notes:     { type: String, default: null },

}, { timestamps: true });

orderSchema.pre('validate', function (next) {
    if (!this.userId && !this.guestEmail) {
        return next(new Error('Either userId or guestEmail is required'));
    }
});

// ── Auto order number ─────────────────────────────────────────────────────────
orderSchema.pre('save', async function () {
    if (this.isNew && !this.orderNumber) {
        const counter = await Counter.findOneAndUpdate(
            { name: 'order' },
            { $inc: { value: 1 } },
            { new: true, upsert: true }
        );
        this.orderNumber = `ORD-${String(counter.value).padStart(8, '0')}`;
    }
});

orderSchema.virtual('isGuest').get(function () {
    return !this.userId;
});

orderSchema.set('toJSON',   { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

orderSchema.index({ 'subOrder.sellerId': 1 });
orderSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Order', orderSchema);
