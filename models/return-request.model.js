import mongoose, { Schema } from 'mongoose';

const returnRequestSchema = new Schema(
    {
        requestNumber: { type: String, unique: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
        sellerId: { type: Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
        orderRef: { type: String, required: true, trim: true },
        itemName: { type: String, required: true, trim: true },
        requestType: { type: String, enum: ['return', 'refund', 'exchange'], required: true },
        reason: { type: String, enum: ['defective', 'wrong', 'changed', 'other'], required: true },
        quantity: { type: Number, min: 1, default: 1 },
        details: { type: String, default: '', trim: true },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'completed'],
            default: 'pending',
            index: true,
        },
        sellerNote: { type: String, default: null, trim: true },
        adminNote: { type: String, default: null },
        isDisputed: { type: Boolean, default: false, index: true },
        disputeId: { type: Schema.Types.ObjectId, ref: 'Dispute', default: null },
        sellerDecidedAt: { type: Date, default: null },
        adminResolvedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

returnRequestSchema.pre('save', function (next) {
    if (!this.requestNumber) {
        const random = Math.floor(100000 + Math.random() * 900000);
        this.requestNumber = `RR-${random}`;
    }
});

export default mongoose.model('ReturnRequest', returnRequestSchema);
