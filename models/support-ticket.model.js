import mongoose, { Schema } from 'mongoose';

const supportTicketSchema = new Schema(
    {
        ticketNumber: { type: String, unique: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        subject: { type: String, required: true, trim: true, maxlength: 200 },
        category: {
            type: String,
            enum: ['order', 'refund', 'product', 'account', 'other'],
            default: 'other',
        },
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        status: {
            type: String,
            enum: ['open', 'in_progress', 'resolved', 'escalated', 'closed'],
            default: 'open',
            index: true,
        },
        orderRef: { type: String, default: null, trim: true },
        message: { type: String, required: true, trim: true, maxlength: 2000 },
        adminReply: { type: String, default: null },
        escalated: { type: Boolean, default: false },
    },
    { timestamps: true }
);

supportTicketSchema.pre('save', function (next) {
    if (!this.ticketNumber) {
        const random = Math.floor(100000 + Math.random() * 900000);
        this.ticketNumber = `TKT-${random}`;
    }
});

export default mongoose.model('SupportTicket', supportTicketSchema);
