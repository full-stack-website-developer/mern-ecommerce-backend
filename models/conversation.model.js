import mongoose, { Schema } from 'mongoose';

const conversationSchema = new mongoose.Schema(
    {
        // The buyer (user)
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        // The seller
        sellerId: {
            type: Schema.Types.ObjectId,
            ref: 'Seller',
            required: true,
            index: true,
        },

        // Optional: link to a specific order
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            default: null,
        },

        // Last message snapshot for conversation list
        lastMessage: {
            type: String,
            default: '',
        },

        lastMessageAt: {
            type: Date,
            default: Date.now,
            index: true,
        },

        // Unread count per side
        unreadByUser: {
            type: Number,
            default: 0,
        },

        unreadBySeller: {
            type: Number,
            default: 0,
        },

        // subject / topic line
        subject: {
            type: String,
            default: '',
            maxlength: [200, 'Subject cannot exceed 200 characters'],
        },

        isArchived: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Compound index so we can quickly find a conversation between a specific user + seller
conversationSchema.index({ userId: 1, sellerId: 1 });

export default mongoose.model('Conversation', conversationSchema);