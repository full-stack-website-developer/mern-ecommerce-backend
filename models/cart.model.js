import mongoose, { Schema } from 'mongoose';

const cartSchema = mongoose.Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },

        items: [{
            productId: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true,
            },

            variantId: {
                type: Schema.Types.ObjectId,
                ref: 'Variant',
            },

            sellerId: {
                type: Schema.Types.ObjectId,
                ref: 'Seller',
                default: null,
            },

            quantity: {
                type: Number,
                min: 1,
                required: true,
            },

            price: {
                type: Number,
                min: 0,
            },
        }],
    }, 
    { timestamps: true }
);


cartSchema.pre('save', function () {
  this.items = this.items.filter(item => item.quantity > 0);
});

cartSchema.virtual('total').get(function () {
  return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

export default mongoose.model('Cart', cartSchema);