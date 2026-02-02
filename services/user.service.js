import { AddressResponseDto } from "../dtos/address.dto.js";
import { UserResponseDto } from "../dtos/user.dto.js";
import addressRepository from "../repositories/address.repository.js";
import userRepository from "../repositories/user.repository.js";
import { AppError } from "../utils/errors.util.js";
import bcrypt from 'bcryptjs';
import { upload, cloudinary } from '../config/cloudinary.js';

class UserService {
    async getUser(id) {
        const user = await userRepository.findById(id, { withAddresses: true });
        if (!user) {
            throw new AppError('User Not Found!', 404);
        }

        return {
            user: UserResponseDto.fromUser(user),
        }
    }

    async editInfo(id, newData) {
        let user = await userRepository.findById(id);
        if (!user) {
            throw new AppError('User Not Found!', 404);
        }
        
        const updatedUser = await userRepository.update(id, newData);
        if (!updatedUser) {
            throw new AppError('Error While Updating User', 505);
        }

        return {
            user: UserResponseDto.fromUser(updatedUser),
        };
    }

    async updateAddress(id, address) {
        let existingAddress = await addressRepository.findById(id);
        if (!existingAddress) {
            throw new AppError('Address Not Found!', 404);
        } 
        
        const updatedAddress = await addressRepository.update(id, address);

        return {
            address: AddressResponseDto.fromAddress(updatedAddress),
        };
    }

    async getAddress(userId) {
        const address = await addressRepository.findByUserId(userId);
        return address || null;
    }

    async createAddress(userId, newAddress) {
        let existingAddress = await addressRepository.findByUserId(userId);
        if (existingAddress) {
            throw new AppError('Address Already Exists!', 409);
        }
        const address = await addressRepository.create({ userId, ...newAddress });

        return {
            address: AddressResponseDto.fromAddress(address),
        };
    }

    async changePassword(id, data) {
        const { currentPassword, newPassword } = data;

        let user = await userRepository.findById(id, { withPassword: true });
        if (!user) {
            throw new AppError('User Not Found!', 404);
        } 
        
        const matched = await bcrypt.compare(currentPassword, user.password);

        if (!matched) {
            throw new AppError('Password is Incorrect', 401);
        }

        user.password = newPassword;
        const updatedUser = await userRepository.save(user);

        return {
            user: UserResponseDto.fromUser(updatedUser),
        };
    }

    async updateAvatar(userId, file) {
        if (!file) {
            throw AppError('Please upload an Image', 400);
        }

        const user = await userRepository.findById(userId);

        if (user.avatar.publicId) {
            await cloudinary.uploader.destroy(user.avatar.publicId);
        }

        user.avatar = {
            url: file.path, // Cloudinary URL
            publicId: file.filename // Cloudinary public ID
        };

        // Update user's profile image in database
        const updatedUser = await userRepository.save(user);

        return {
            user: UserResponseDto.fromUser(updatedUser),
        };
    }

    async createPassword(userId, password) {
        let user = await userRepository.findById(userId);
        if (!user) {
            throw new AppError('User Not Exists!', 404);
        }

        if (user.password) {
            throw new AppError('Password Already Exists!', 409);
        }

        user.password = password;
        await userRepository.save(user);
    }
}

export default new UserService();