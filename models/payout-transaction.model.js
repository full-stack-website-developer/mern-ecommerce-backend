import mongoose, { Schema } from 'mongoose';

const payoutTransactionSchema = new Schema(
    {
        sellerId: {
            type: Schema.Types.ObjectId,
            ref: 'Seller',
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0.01,
        },
        currency: {
            type: String,
            default: 'usd',
            lowercase: true,
            trim: true,
        },
        method: {
            type: String,
            enum: ['stripe'],
            default: 'stripe',
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending',
            index: true,
        },
        stripeTransferId: {
            type: String,
            default: null,
        },
        destinationAccountId: {
            type: String,
            default: null,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: null,
        },
        failureReason: {
            type: String,
            default: null,
        },
        processedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

payoutTransactionSchema.index({ sellerId: 1, createdAt: -1 });

export default mongoose.model('PayoutTransaction', payoutTransactionSchema);
