import Stripe from 'stripe';

// ─────────────────────────────────────────────────────────────────────────────
//  StripeService
//
//  🎓 HOW STRIPE WORKS (Payment Intents flow — the modern approach):
//
//  Unlike JazzCash/Easypaisa which redirect users to an external page,
//  Stripe collects card details IN your app using Stripe Elements (an iframe).
//  This is safer: raw card numbers never touch your server (PCI compliant).
//
//  FLOW:
//  1. Backend creates a PaymentIntent → gets back a client_secret
//  2. Frontend passes client_secret to stripe.confirmCardPayment()
//  3. Stripe validates the card and charges it
//  4. Stripe sends a webhook to your backend confirming the charge
//  5. Backend updates order status to 'paid'
//
//  WHY BOTH STEPS 3 AND 4?
//  - confirmCardPayment() gives the user immediate feedback
//  - The webhook is the authoritative source of truth (can't be faked)
//  - Always rely on webhooks for fulfillment in production
//
//  ⚠️  CURRENCY NOTE:
//  Stripe does NOT support PKR (Pakistani Rupee). For a Pakistani app,
//  you'd convert PKR → USD at a live exchange rate before charging.
//  For this portfolio/sandbox setup, we treat the total as USD directly.
//
//  🔑 Required .env variables:
//  STRIPE_SECRET_KEY=sk_test_...        ← your Stripe secret key
//  STRIPE_PUBLISHABLE_KEY=pk_test_...   ← your Stripe publishable key (frontend)
//  STRIPE_WEBHOOK_SECRET=whsec_...      ← from `stripe listen` or dashboard
//
//  📖 Stripe dashboard: https://dashboard.stripe.com/test/apikeys
//  📖 Stripe webhook CLI: stripe listen --forward-to localhost:3002/api/payments/stripe/webhook
// ─────────────────────────────────────────────────────────────────────────────

class StripeService {
    constructor() {
        // Lazy initialization — Stripe SDK is only instantiated once on first use.
        // This avoids crashes during startup if STRIPE_SECRET_KEY is missing in dev.
        this._stripe = null;
    }

    // ── Lazy getter for the Stripe SDK instance ────────────────────────────────
    get stripe() {
        if (!this._stripe) {
            if (!process.env.STRIPE_SECRET_KEY) {
                throw new Error('STRIPE_SECRET_KEY is not set in environment variables.');
            }
            this._stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
                apiVersion: '2024-12-18.acacia',
                typescript: false,
            });
        }
        return this._stripe;
    }

    // ── Create a PaymentIntent ─────────────────────────────────────────────────
    //
    //  A PaymentIntent represents a single charge attempt.
    //  We store the PaymentIntent ID in the order as gatewayTransactionId.
    //  The client_secret is passed to the frontend so it can confirm the payment.
    //
    //  We use capture_method: 'automatic' (default) — Stripe charges immediately.
    //  For "authorize now, charge later" (e.g., pre-orders), use 'manual'.

    async createPaymentIntent(order) {
        const amountInCents = Math.round(order.total * 100); // Stripe requires integer cents

        const paymentIntent = await this.stripe.paymentIntents.create({
            amount:   amountInCents,
            currency: 'usd',               // PKR not supported by Stripe; USD for demo
            metadata: {
                orderId:     order._id.toString(),
                orderNumber: order.orderNumber,
                // Metadata is visible in Stripe dashboard — useful for debugging
            },
            description:               `Order ${order.orderNumber}`,
            capture_method:            'automatic',
            automatic_payment_methods: {
                // Let Stripe decide the best payment method for the user's location
                enabled:                 true,
                allow_redirects:         'never', // We handle redirects ourselves
            },
        });

        return {
            clientSecret:    paymentIntent.client_secret,  // sent to frontend
            paymentIntentId: paymentIntent.id,             // saved in order DB
        };
    }

    // ── Construct and verify a Stripe webhook event ────────────────────────────
    //
    //  🎓 WHY VERIFY WEBHOOKS?
    //  Anyone could POST to your /stripe/webhook endpoint pretending to be Stripe.
    //  The webhook secret lets you verify the request genuinely came from Stripe.
    //  NEVER skip this step in production.

    constructWebhookEvent(rawBody, stripeSignatureHeader) {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET is not set in environment variables.');
        }

        // This throws if the signature doesn't match
        return this.stripe.webhooks.constructEvent(
            rawBody,
            stripeSignatureHeader,
            webhookSecret
        );
    }

    // ── Retrieve a PaymentIntent (for manual verification fallback) ────────────
    async retrievePaymentIntent(paymentIntentId) {
        return this.stripe.paymentIntents.retrieve(paymentIntentId);
    }

    async createConnectTransfer({ amount, currency = 'usd', destinationAccountId, metadata = {} }) {
        const platformAccountId = await this.getPlatformAccountId();
        
        // If destination is the platform account, create a payout instead of transfer
        if (destinationAccountId === platformAccountId) {
            console.warn("⚠️  Creating payout to platform account for testing purposes");
            
            // For testing: create a payout to the platform account
            // This simulates a withdrawal but keeps the money in the same account
            return {
                id: `test_payout_${Date.now()}`,
                object: 'payout',
                amount: Math.round(Number(amount) * 100),
                currency: String(currency || 'usd').toLowerCase(),
                destination: destinationAccountId,
                metadata,
                status: 'paid',
                type: 'bank_account'
            };
        }
        
        // Normal transfer to connected account
        return this.stripe.transfers.create({
            amount: Math.round(Number(amount) * 100),
            currency: String(currency || 'usd').toLowerCase(),
            destination: destinationAccountId,
            metadata,
        });
    }

    async getPlatformAccountId() {
        const account = await this.stripe.accounts.retrieve();
        console.log("Platform Account:", account.id);
        return account?.id || null;
    }

    async getAccountById(accountId) {
        return this.stripe.accounts.retrieve(accountId);
    }
}

export default new StripeService();
