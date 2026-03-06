import mongoose, { Schema } from 'mongoose';

const variantSchema = new Schema({

    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true, 
    },

    sku: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
    },

    price: {
        type: Number,
        required: true,
        min: 0,
    },

    quantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },

    options: [
        {
            optionId: {
                type: Schema.Types.ObjectId,
                ref: 'Option',
                required: true,
            },
            valueId: {
                type: Schema.Types.ObjectId,
                required: true,
            },
            _id: false,
        }
    ],

    isActive: {
        type: Boolean,
        default: true,
    },

}, { timestamps: true });

export default mongoose.model('Variant', variantSchema);