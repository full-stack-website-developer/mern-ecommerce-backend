import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
//  PayPalService
//
//  🎓 HOW PAYPAL WORKS (Orders v2 API — the modern approach):
//
//  Unlike Stripe which collects card details IN your page,
//  PayPal opens its own popup/redirect where the buyer approves.
//
//  FLOW:
//  1. Frontend clicks "PayPal" button
//  2. PayPal JS SDK calls our backend's createOrder → we return a PayPal order ID
//  3. PayPal SDK opens popup — user logs in and approves
//  4. On approval, SDK calls our backend's captureOrder
//  5. We capture the funds → mark our order as paid
//
//  WHY USE THE REST API DIRECTLY?
//  Calling PayPal's API directly (vs using their SDK) makes the code transparent.
//  You can see exactly what's sent / received. Great for debugging + interviews.
//
//  🔑 Required .env variables:
//  PAYPAL_CLIENT_ID=...       ← from developer.paypal.com → My Apps
//  PAYPAL_CLIENT_SECRET=...   ← same place
//  PAYPAL_MODE=sandbox        ← 'sandbox' for testing, 'live' for production
//
//  📖 PayPal developer portal: https://developer.paypal.com/dashboard/
//  📖 PayPal sandbox: https://sandbox.paypal.com  (use sandbox buyer account)
// ─────────────────────────────────────────────────────────────────────────────

const PAYPAL_URLS = {
    sandbox: 'https://api-m.sandbox.paypal.com',
    live:    'https://api-m.paypal.com',
};

class PayPalService {
    constructor() {
        this._accessToken = null;
        this._tokenExpiry  = null;
    }

    // ── Determine base URL based on mode ──────────────────────────────────────
    get baseUrl() {
        const mode = process.env.PAYPAL_MODE || 'sandbox';
        return PAYPAL_URLS[mode] ?? PAYPAL_URLS.sandbox;
    }

    // ── Get OAuth 2.0 access token ────────────────────────────────────────────
    //
    //  🎓 PayPal uses OAuth 2.0 client credentials.
    //  The token is short-lived (~9 hours). We cache it to avoid a round-trip
    //  on every request — only re-fetch when it's expired or missing.

    async getAccessToken() {
        // Return cached token if still valid (with 60s buffer)
        if (this._accessToken && this._tokenExpiry && Date.now() < this._tokenExpiry - 60_000) {
            return this._accessToken;
        }

        const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;

        if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
            throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set in .env');
        }

        const response = await axios.post(
            `${this.baseUrl}/v1/oauth2/token`,
            'grant_type=client_credentials',
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                auth: { username: PAYPAL_CLIENT_ID, password: PAYPAL_CLIENT_SECRET },
            }
        );

        this._accessToken = response.data.access_token;
        // expires_in is in seconds
        this._tokenExpiry = Date.now() + response.data.expires_in * 1000;

        return this._accessToken;
    }

    // ── Create a PayPal Order ─────────────────────────────────────────────────
    //
    //  Creates a PayPal "order" object that the frontend SDK uses to open the
    //  PayPal checkout popup. Returns a PayPal order ID.
    //
    //  The `reference_id` is our internal order ID for matching on capture.

    async createOrder(internalOrder) {
        const token = await this.getAccessToken();

        const amountValue = internalOrder.total.toFixed(2);

        const response = await axios.post(
            `${this.baseUrl}/v2/checkout/orders`,
            {
                intent: 'CAPTURE',  // Charge immediately (vs AUTHORIZE for capture later)
                purchase_units: [
                    {
                        reference_id: internalOrder._id.toString(),
                        description:  `Order ${internalOrder.orderNumber}`,
                        amount: {
                            currency_code: 'USD',    // PayPal needs a supported currency
                            value: amountValue,
                        },
                    },
                ],
                application_context: {
                    brand_name:          'MyShop',
                    user_action:         'PAY_NOW',   // Button says "Pay Now" not "Continue"
                    return_url:          `${process.env.FRONTEND_URL}/order-success`,
                    cancel_url:          `${process.env.FRONTEND_URL}/checkout`,
                },
            },
            {
                headers: {
                    Authorization:  `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return {
            paypalOrderId: response.data.id,   // Send this to frontend
            status:        response.data.status,
        };
    }

    // ── Capture a PayPal Order ────────────────────────────────────────────────
    //
    //  Called after the buyer approves in the PayPal popup.
    //  "Capture" means: actually move the money.
    //  Returns the captured amount + transaction ID for storage.

    async captureOrder(paypalOrderId) {
        const token = await this.getAccessToken();

        const response = await axios.post(
            `${this.baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
            {},  // empty body required by PayPal
            {
                headers: {
                    Authorization:  `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const order  = response.data;
        const capture = order.purchase_units?.[0]?.payments?.captures?.[0];

        return {
            success:           order.status === 'COMPLETED',
            paypalOrderId:     order.id,
            transactionId:     capture?.id ?? null,       // PayPal transaction ID
            status:            order.status,
            rawResponse:       order,
        };
    }

    // ── Verify order details (optional safety check) ──────────────────────────
    //
    //  Before fulfillment, verify the amount PayPal charged matches what we expect.
    //  This prevents tampering where a buyer modifies the JS SDK payload.

    async getOrderDetails(paypalOrderId) {
        const token = await this.getAccessToken();
        const response = await axios.get(
            `${this.baseUrl}/v2/checkout/orders/${paypalOrderId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    }
}

export default new PayPalService();