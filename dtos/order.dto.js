// ─────────────────────────────────────────────────────────────────────────────
//  OrderDto — controls what data the API returns to the frontend.
//  Sensitive fields (gatewayResponse, __v) are never sent out.
// ─────────────────────────────────────────────────────────────────────────────

// class OrderDto {
//     constructor(order, options = {}) {
//         const { sellerId } = options;
//         const customerUser = order.userId && typeof order.userId === 'object' ? order.userId : null;

//         this._id = order._id;
//         this.orderNumber = order.orderNumber;
//         this.status = order.status;
//         this.paymentStatus = order.paymentStatus;
//         this.paymentMethod = order.paymentMethod;
//         this.createdAt = order.createdAt;
//         this.shippingMethod = order.shippingMethod;
//         this.shippingCost = order.shippingCost;
//         this.shippingAddress = order.shippingAddress;
//         this.isGuest = !order.userId;
//         this.customer = {
//             id: customerUser?._id ?? null,
//             name: customerUser
//                 ? `${customerUser.firstName ?? ''} ${customerUser.lastName ?? ''}`.trim()
//                 : 'Guest',
//             email: customerUser?.email ?? order.guestEmail ?? null,
//         };

//         if (sellerId) {
//         const sellerSubOrder = order.subOrder.find(
//             s => String(s.sellerId) === String(sellerId)
//         );

//         this.items = sellerSubOrder?.items ?? [];
//         this.subtotal = sellerSubOrder?.subtotal ?? 0;
//         this.tax = sellerSubOrder?.tax ?? 0;
//         this.total = sellerSubOrder?.total ?? 0;
//         this.subOrderStatus = sellerSubOrder?.fulfillmentStatus ?? 'unfulfilled';
//         this.trackingNumber = sellerSubOrder?.trackingNumber ?? null;
//         this.carrier = sellerSubOrder?.carrier ?? null;
//         this.shippedAt = sellerSubOrder?.shippedAt ?? null;
//         this.deliveredAt = sellerSubOrder?.deliveredAt ?? null;
//         } else {
//         // Customer/Admin full view
//         this.subOrder = order.subOrder;
//         this.subtotal = order.subtotal;
//         this.tax = order.tax;
//         this.total = order.total;
//         }
//     }
// }

// export default OrderDto;


class OrderDto {
    constructor(order, options = {}) {
        const { sellerId, role } = options;

        this._id         = order._id;
        this.orderNumber = order.orderNumber;
        this.status      = order.status;
        this.paymentStatus = order.paymentStatus;
        this.paymentMethod = order.paymentMethod;
        this.gatewayTransactionId = order.gatewayTransactionId ?? null;
        this.createdAt     = order.createdAt;
        this.updatedAt     = order.updatedAt;
        this.shippingMethod = order.shippingMethod;
        this.shippingCost   = order.shippingCost;
        this.shippingAddress = order.shippingAddress;
        this.notes  = order.notes;
        this.isGuest = !order.userId;

        if (order.userId) {
            this.customer = {
                _id:       order.userId._id ?? order.userId,
                firstName: order.userId.firstName ?? '',
                lastName:  order.userId.lastName  ?? '',
                email:     order.userId.email     ?? '',
            };
        } else {
            this.customer = { email: order.guestEmail };
        }

        if (sellerId) {
            // ── Seller view: only expose their sub-order ──────────────────────
            const sellerSubOrder = order.subOrder?.find(
                s => String(s.sellerId?._id ?? s.sellerId) === String(sellerId)
            );

            this.subOrder = sellerSubOrder
                ? {
                    _id:               sellerSubOrder._id,
                    items:             sellerSubOrder.items ?? [],
                    subtotal:          sellerSubOrder.subtotal ?? 0,
                    tax:               sellerSubOrder.tax ?? 0,
                    total:             sellerSubOrder.total ?? 0,
                    fulfillmentStatus: sellerSubOrder.fulfillmentStatus ?? 'unfulfilled',
                    trackingNumber:    sellerSubOrder.trackingNumber ?? null,
                    carrier:           sellerSubOrder.carrier ?? null,
                    shippedAt:         sellerSubOrder.shippedAt ?? null,
                    deliveredAt:       sellerSubOrder.deliveredAt ?? null,
                    sellerNote:        sellerSubOrder.sellerNote ?? null,
                }
                : null;

            this.subtotal = sellerSubOrder?.subtotal ?? 0;
            this.tax      = sellerSubOrder?.tax ?? 0;
            this.total    = sellerSubOrder?.total ?? 0;

        } else {
            // ── Admin / Customer full view ────────────────────────────────────
            this.subOrder = order.subOrder ?? [];
            this.subtotal = order.subtotal;
            this.tax      = order.tax;
            this.discount = order.discount;
            this.total    = order.total;
            this.couponCode = order.couponCode;

            if (role === 'admin') {
                this.adminNote = order.adminNote ?? null;
            }
        }
    }
}

export default OrderDto;