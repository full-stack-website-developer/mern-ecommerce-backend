import mongoose, { Schema } from 'mongoose';

const disputeSchema = new Schema(
    {
        disputeNumber: { type: String, unique: true, index: true },
        orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
        returnRequestId: { type: Schema.Types.ObjectId, ref: 'ReturnRequest', default: null, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        sellerId: { type: Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
        type: { type: String, enum: ['refund', 'item_not_received', 'wrong_item', 'other'], required: true },
        reason: { type: String, required: true, trim: true, maxlength: 1000 },
        status: { type: String, enum: ['open', 'in_review', 'resolved', 'closed'], default: 'open', index: true },
        resolution: { type: String, default: null },
    },
    { timestamps: true }
);

disputeSchema.pre('save', function (next) {
    if (!this.disputeNumber) {
        const random = Math.floor(100000 + Math.random() * 900000);
        this.disputeNumber = `DSP-${random}`;
    }
});

export default mongoose.model('Dispute', disputeSchema);
