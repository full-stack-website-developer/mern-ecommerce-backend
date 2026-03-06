import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
//  Easypaisa Service
//
//  🎓 HOW EASYPAISA WORKS (Hosted Checkout flow):
//
//  The flow is almost identical to JazzCash:
//  1. Build a signed payment request
//  2. Redirect user to Easypaisa's hosted checkout page
//  3. User approves payment in their Easypaisa app / USSD
//  4. Easypaisa POSTs result to your callback URL
//  5. Verify the signature, update order
//
//  SANDBOX registration:
//  https://sandbox.easypaisa.com.pk  (register as merchant)
//  → You get StoreId, HashKey
//
//  🔑 Add to your .env:
//  EASYPAISA_STORE_ID=your_store_id
//  EASYPAISA_HASH_KEY=your_hash_key
//  EASYPAISA_RETURN_URL=http://localhost:3002/api/payments/easypaisa/callback
//  EASYPAISA_URL=https://easypaisasandbox.easypaisa.com.pk/easypay/
// ─────────────────────────────────────────────────────────────────────────────

class EasypaisaService {

    constructor() {
        this.storeId    = process.env.EASYPAISA_STORE_ID;
        this.hashKey    = process.env.EASYPAISA_HASH_KEY;
        this.returnUrl  = process.env.EASYPAISA_RETURN_URL;
        this.gatewayUrl = process.env.EASYPAISA_URL || 'https://easypaisasandbox.easypaisa.com.pk/easypay/';
    }

    // ── Build the payment request ─────────────────────────────────────────────
    buildPaymentRequest(order) {
        const orderId    = order._id.toString();
        const amount     = order.total.toFixed(2);    // Easypaisa uses PKR with 2 decimals
        const expiryDate = this._formatDate(this._addMinutes(new Date(), 30));

        const params = {
            storeId:         this.storeId,
            orderId:         orderId,
            transactionAmount: amount,
            mobileAccountNo: '',          // left blank — customer fills on the gateway
            emailAddress:    order.guestEmail || '',
            merchantHashedReq: '',        // filled below
            transactionType: 'InitialRequest',
            tokenExpiry:     expiryDate,
            bankIdentificationNumber: '',
            encryptedHashRequest: '',
            bankMnemonic: '',
        };

        params.merchantHashedReq = this._generateHash(params);

        return {
            gatewayUrl: this.gatewayUrl,
            params,
            orderId,
        };
    }

    // ── Verify Easypaisa's callback ───────────────────────────────────────────
    verifyCallback(callbackBody) {
        const { merchantHashedReq, responseCode, ...rest } = callbackBody;

        const computed = this._generateHash({ ...rest, merchantHashedReq: '' });

        const hashMatches    = computed === merchantHashedReq;
        const paymentSuccess = responseCode === '0000';   // '0000' = success in Easypaisa

        return { valid: hashMatches && paymentSuccess, responseCode };
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    _generateHash(params) {
        // Easypaisa: concatenate selected fields in fixed order, then SHA-256 with hashKey
        const data = [
            params.storeId,
            params.orderId,
            params.transactionAmount,
            params.mobileAccountNo,
            this.hashKey,
        ].join('');

        return crypto.createHash('sha256').update(data).digest('hex');
    }

    _formatDate(date) {
        // Easypaisa format: YYYYMMDDHHmmss
        return date.toISOString()
            .replace(/[-T:.Z]/g, '')
            .slice(0, 14);
    }

    _addMinutes(date, minutes) {
        return new Date(date.getTime() + minutes * 60 * 1000);
    }
}

export default new EasypaisaService();