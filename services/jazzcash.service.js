import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
//  JazzCash Service
//
//  🎓 HOW JAZZCASH WORKS (Mobile Account / MWALLET flow):
//
//  1. Your backend builds a payment request with specific fields
//  2. You hash all the fields with your IntegritySalt (HMAC-SHA256)
//  3. You send the user to JazzCash's hosted payment page (or redirect)
//  4. User pays on JazzCash's page
//  5. JazzCash sends a POST request to your return URL with the result
//  6. You verify the hash on that result to confirm it wasn't tampered
//  7. Update the order's paymentStatus to 'paid' if hash matches
//
//  SANDBOX credentials (free):
//  Register at: https://sandbox.jazzcash.com.pk/ApplicationLogin/Login
//  → You get MerchantId, Password, IntegritySalt
//
//  🔑 Add to your .env:
//  JAZZCASH_MERCHANT_ID=your_merchant_id
//  JAZZCASH_PASSWORD=your_password
//  JAZZCASH_INTEGRITY_SALT=your_salt
//  JAZZCASH_RETURN_URL=http://localhost:3002/api/payments/jazzcash/callback
//  JAZZCASH_URL=https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/
// ─────────────────────────────────────────────────────────────────────────────

class JazzCashService {

    constructor() {
        this.merchantId    = process.env.JAZZCASH_MERCHANT_ID;
        this.password      = process.env.JAZZCASH_PASSWORD;
        this.integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;
        this.returnUrl     = process.env.JAZZCASH_RETURN_URL;
        this.gatewayUrl    = process.env.JAZZCASH_URL || 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/';
    }

    // ── Build the payment URL the frontend will redirect to ──────────────────
    buildPaymentRequest(order) {
        const txnRefNo    = `T${Date.now()}`; // must be unique per transaction
        const txnDateTime = this._formatDateTime(new Date());
        const txnExpiry   = this._formatDateTime(this._addMinutes(new Date(), 30));
        const amount      = String(Math.round(order.total * 100)); // JazzCash expects paisa

        // ── These are ALL the fields JazzCash requires ───────────────────────
        const params = {
            pp_Version:            '1.1',
            pp_TxnType:            'MWALLET',
            pp_Language:           'EN',
            pp_MerchantID:         this.merchantId,
            pp_Password:           this.password,
            pp_TxnRefNo:           txnRefNo,
            pp_Amount:             amount,
            pp_TxnCurrency:        'PKR',
            pp_TxnDateTime:        txnDateTime,
            pp_BillReference:      order._id.toString(),
            pp_Description:        `Order ${order.orderNumber}`,
            pp_TxnExpiryDateTime:  txnExpiry,
            pp_ReturnURL:          this.returnUrl,
            pp_SecureHash:         '',  // filled below
        };

        // ── Generate the HMAC hash ────────────────────────────────────────────
        params.pp_SecureHash = this._generateHash(params);

        return {
            gatewayUrl: this.gatewayUrl,
            params,          // POST these as a form to gatewayUrl
            txnRefNo,        // save this in the order so we can match the callback
        };
    }

    // ── Verify the hash that JazzCash POSTs back to your return URL ──────────
    // Returns true if the response is genuine and payment succeeded
    verifyCallback(callbackBody) {
        const { pp_SecureHash, pp_ResponseCode, ...rest } = callbackBody;

        // Recalculate hash without pp_SecureHash
        const computed = this._generateHash({ ...rest, pp_SecureHash: '' });

        const hashMatches    = computed === pp_SecureHash;
        const paymentSuccess = pp_ResponseCode === '000';  // '000' = success in JazzCash

        return { valid: hashMatches && paymentSuccess, responseCode: pp_ResponseCode };
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    _generateHash(params) {
        // JazzCash hashing rule:
        // Sort all keys alphabetically, join values with '&', prepend IntegritySalt
        const sortedKeys = Object.keys(params)
            .filter(k => k !== 'pp_SecureHash' && params[k] !== '')
            .sort();

        const dataString = this.integritySalt + '&' +
            sortedKeys.map(k => params[k]).join('&');

        return crypto
            .createHmac('sha256', this.integritySalt)
            .update(dataString)
            .digest('hex');
    }

    _formatDateTime(date) {
        // JazzCash format: YYYYMMDDHHmmss
        return date.toISOString()
            .replace(/[-T:.Z]/g, '')
            .slice(0, 14);
    }

    _addMinutes(date, minutes) {
        return new Date(date.getTime() + minutes * 60 * 1000);
    }
}

export default new JazzCashService();