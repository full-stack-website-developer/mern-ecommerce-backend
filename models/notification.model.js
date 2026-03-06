import mongoose, { Schema } from 'mongoose';

const notificationSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        type: { type: String, enum: ['order', 'promotion', 'account', 'payment', 'support'], default: 'account' },
        title: { type: String, required: true, trim: true, maxlength: 120 },
        message: { type: String, required: true, trim: true, maxlength: 500 },
        read: { type: Boolean, default: false, index: true },
        meta: { type: Schema.Types.Mixed, default: null },
    },
    { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
