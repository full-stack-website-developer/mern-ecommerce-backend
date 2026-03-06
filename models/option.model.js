import mongoose, { Schema } from 'mongoose';

/**
 * OptionGroup Schema - Defines groups like Color, Size, Material
 * Each group has multiple values that can be selected
 */
const optionSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        // Examples: 'Color', 'Size', 'Material', 'Style'
    },

    values: [{
        label: {
            type: String,
            required: true,
            trim: true,
            // Examples: 'Red', 'Blue', 'Small', 'Large'
        },

        // price: {
        //     type: Number,
        //     required: true,
        //     min: 0,
        // },

        // quantity: {
        //     type: Number,
        //     required: true,
        //     min: 0,
        // },

        // // For color hex codes, image URLs, etc.
        // metadata: {
        //     type: Schema.Types.Mixed,
        //     default: null,
        //     // Examples: { hex: '#FF0000' }, { image: 'url' }
        // },
        enabled: {
            type: Boolean,
            default: true,
        }
    }],

    // // Display type for UI
    // displayType: {
    //     type: String,
    //     enum: ['dropdown', 'color-swatch', 'button', 'image'],
    //     default: 'dropdown',
    // },

    // Order for display
    position: {
        type: Number,
        default: 0,
    },

    status: {
        type: String,
        enum: ['enabled', 'disabled'],
        default: 'enabled',
    },

}, {
    timestamps: true,
});

// Validate that values array is not empty
optionSchema.pre('save', async function () {
  if (!this.values || this.values.length === 0) {
    throw new Error('Option group must have at least one value');
  }
});

export default mongoose.model('Option', optionSchema);