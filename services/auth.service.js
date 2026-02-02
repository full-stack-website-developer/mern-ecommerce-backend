import bcrypt from 'bcryptjs';
import { UserResponseDto } from "../dtos/user.dto.js";
import userRepository from "../repositories/user.repository.js";
import { generateToken } from "../utils/jwt.util.js";
import { AppError } from "../utils/errors.util.js";
import { sendOtpMail } from '../email/send-otp-mail.js';
import axios from 'axios';
import { oauth2client } from '../config/google.config.js';

class authService {
    async register(userData) {
        const existingUser = await userRepository.findByEmail(userData.email);
        if (existingUser) {
            throw new AppError('Email Already Registered', 409);
        }

        const user = await userRepository.create(userData);

        const token = generateToken(user._id);

        return{
            user: UserResponseDto.fromUser(user),
            token,
        };
    }
    
    async login (email, password) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new AppError('Invalid Credentials', 401);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new AppError('Invalid Credentials', 401);
        }

        const token = generateToken(user._id);

        return {
            user: UserResponseDto.fromUser(user),
            token,
        };
    }

    async forgotPassword(email) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new AppError('User Not Found', 404);
        };

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000);
        
        user.otp = otp;
        user.otpExpiry = expiry;
            
        await userRepository.save(user);
        await sendOtpMail(email, otp);

        return {
            user: UserResponseDto.fromUser(user),
        }
    }

    async verifyOTP(email, otp) {
        if (!otp) {
            throw new AppError('OTP is Required!', 400);
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new AppError('User Not Found', 404);
        }

        if (!user.otp || !user.otpExpiry) {
            throw new AppError('OTP not generated or Already Verified', 400);
        }

        if (user.otpExpiry < new Date()) {
            throw new AppError('OTP has Expired. Please request new one', 400);
        }

        if (user.otp !== otp) {
            throw new AppError('Invalid OTP!', 400);
        }

        user.otp = null;
        user.otpExpiry = null;

        await userRepository.save(user);
    }

    async changePassword(newPassword, confirmPassword, email) {
        if (!newPassword || !confirmPassword) {
            throw new AppError('All Fields are Required!', 400);
        }

        if (newPassword !== confirmPassword) {
            throw new AppError('Password do not match', 400);
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new AppError('User Not Found', 404);
        }

        user.password = newPassword;
        
        await userRepository.save(user);
    }

    async googleLogin(code) {
        const googleResponse = await oauth2client.getToken(code);
        oauth2client.setCredentials(googleResponse);

        const googleRes = await axios.get(
            `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleResponse.tokens.access_token}`
        )
        
        let user = await userRepository.findByEmail(googleRes.data.email);
        if (!user) {
            const newGoogleLoginUser = {
                firstName: googleRes.data.given_name,
                lastName: googleRes.data.family_name,
                email: googleRes.data.email,
                googleId: googleRes.data.id,
                password: null, 
                phone: null  
            }
            user = await userRepository.create(newGoogleLoginUser);
        }

        const token = generateToken(user._id);

        return{
            user: UserResponseDto.fromUser(user),
            token,
        };
    }
}

export default new authService();