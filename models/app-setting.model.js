import mongoose, { Schema } from 'mongoose';

const appSettingSchema = new Schema(
    {
        key: { type: String, required: true, unique: true, index: true, trim: true },
        value: { type: Schema.Types.Mixed, required: true },
    },
    { timestamps: true }
);

export default mongoose.model('AppSetting', appSettingSchema);
