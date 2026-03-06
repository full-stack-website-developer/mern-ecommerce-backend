import mongoose, { Schema } from 'mongoose';

const wishlistItemSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
        saveForLater: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

wishlistItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

export default mongoose.model('WishlistItem', wishlistItemSchema);
