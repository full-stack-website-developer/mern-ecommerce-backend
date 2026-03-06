import mongoose, { Schema } from 'mongoose';

const reactionSchema = new Schema({
    emoji: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { _id: false });

const attachmentSchema = new Schema({
    url: { type: String, required: true },
    publicId: { type: String, default: null },
    originalName: { type: String, default: null },
    mimeType: { type: String, default: null },
    size: { type: Number, default: 0 },
    // 'image' | 'file' | 'audio'
    type: { type: String, enum: ['image', 'file', 'audio'], default: 'file' },
}, { _id: false });

const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
            index: true,
        },
        senderId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // 'user' | 'seller'
        senderRole: {
            type: String,
            enum: ['user', 'seller'],
            required: true,
        },
        body: {
            type: String,
            default: '',
            maxlength: [4000, 'Message cannot exceed 4000 characters'],
        },
        // Optional file/image attachment
        attachment: {
            type: attachmentSchema,
            default: null,
        },
        // Emoji reactions: Map from emoji → array of userIds
        reactions: {
            type: [reactionSchema],
            default: [],
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
            default: null,
        },
        // soft-delete
        deletedAt: {
            type: Date,
            default: null,
        },
        // 'text' | 'image' | 'file' | 'system'
        messageType: {
            type: String,
            enum: ['text', 'image', 'file', 'system'],
            default: 'text',
        },
    },
    { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.model('Message', messageSchema);