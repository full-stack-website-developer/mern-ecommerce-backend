import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
    {
        avatar: {
            url: {
                type: String,
                default: 'https://res.cloudinary.com/dpmvrta2s/image/upload/v1770050272/default-image_wvampm.jpg'
            },
            publicId: {
                type: String, // To delete old image from Cloudinary
                default: null
            }
        },

        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true,
            minlength: [2, 'First name must be at least 2 characters'],
            maxlength: [50, 'First name cannot exceed 50 characters']
        },
        
        lastName: {
            type: String,
            trim: true,
            minlength: [3, 'Last name must be at least 3 characters'],
            maxlength: [50, 'Last name cannot exceed 50 characters'],
            set: v => v === '' ? undefined : v
        },
        
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
        },
        
        password: {
            type: String,
            required: function() {
                return !this.googleId;
            },
            minlength: [8, 'Password must be at least 8 characters'],
            select: false // Don't return password by default
        },
        
        role: {
            type: String,
            enum: {
                values: ['admin', 'user', 'seller'],
                message: '{VALUE} is not a valid role'
            },
            default: 'user'
        },
        
        phone: {
            type: String,
            required: function() {
                return !this.googleId;
            },
            match: [/^[0-9]{10,15}$/, 'Please provide a valid phone number']
        },

        bio: {
            type: String,
            trim: true,
            minlength: [15, 'Bio must be at least 15 characters'],
            maxlength: [250, 'Bio cannot exceed 50 characters'],
            set: v => v === '' ? undefined : v
        },

        googleId: {
            type: String,
            default: null
        },
        
        isActive: {
            type: Boolean,
            default: true
        },
        
        otp: { 
            type: String, 
            default: null 
        },
        
        otpExpiry: { 
            type: Date, 
            default: null 
        },

        setPassword: {
            type: Boolean,
            default: false,
        }
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName || ''}`.trim();
});

UserSchema.virtual('addresses', {
  ref: 'Address',            
  localField: '_id',        
  foreignField: 'userId'    
});

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

// Hash password before saving
UserSchema.pre('save', async function() {
    this.setPassword = !!this.password;

    if (!this.isModified('password')) return;
    
    try {
        this.password = await bcrypt.hash(this.password, 12);
        return;
    } catch (error) {
        return;
    }
});

export default mongoose.model('User', UserSchema);