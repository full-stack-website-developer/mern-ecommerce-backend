import { CreateSellerDto, SellerResponseDto } from "../dtos/seller.dto.js";
import { ProductResponseDto } from "../dtos/product.dto.js";
import userRepository from "../repositories/user.repository.js";
import SellerRepository from "../repositories/seller.repository.js";
import { AppError } from "../utils/errors.util.js";
import addressRepository from "../repositories/address.repository.js";
import bankRepository from "../repositories/bank.repository.js";
import { UserResponseDto } from "../dtos/user.dto.js";
import sellerRepository from "../repositories/seller.repository.js";
import { sendApplySellerMail } from "../email/send-seller-apply-mail.js";
import dashboardService from "./dashboard.service.js";

class SellerService {
    _slugify(value = '') {
        return String(value)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    async apply(req) {
        const userId = req.user.id;
        const logo = req.files.logo[0];
        const licenseDoc = req.files.licenseDoc[0];
        const values = JSON.parse(req.body.values);

        const user = await userRepository.findById(userId);
        if (!user) {
            throw new AppError('User Not Exists. Please Create User Profile First before applying as a Seller!', 404);
        }

        const newSellerData = new CreateSellerDto(values, logo, licenseDoc, userId);
        
        const seller = await SellerRepository.create({ userId, ...newSellerData.businessInfo });
        await addressRepository.create({ userId, ...newSellerData.addressInfo});
        await bankRepository.create({ userId, ...newSellerData.bankInfo })

        const updatedUser = await userRepository.update(userId, { isSeller: true });

        if (!seller) {
            throw new AppError('Seller not Created!', 505);
        }

        await sendApplySellerMail(user.email);

        return {
            seller: SellerResponseDto.fromSeller(seller),
            user: UserResponseDto.fromUser(updatedUser),
        };
    }

    async getAll() {
        const sellers = await sellerRepository.all({ withUser: true });

        return {
            sellers,
        }
    }

    async getPublicStoreBySlug(rawSlug) {
        const slug = this._slugify(rawSlug);
        if (!slug) {
            throw new AppError('Invalid store slug', 400);
        }

        const slugCandidates = [...new Set([
            slug,
            slug.replace(/^store-/, ''),
            slug.startsWith('store-') ? slug : `store-${slug}`,
        ])].filter(Boolean);

        let seller = null;
        for (const candidate of slugCandidates) {
            const sellerIdFromProfile = await sellerRepository.findSellerIdByProfileSlug(candidate);
            if (sellerIdFromProfile) {
                seller = await sellerRepository.findApprovedById(sellerIdFromProfile);
                if (seller) break;
            }
        }

        if (!seller) {
            for (const candidate of slugCandidates) {
                seller = await sellerRepository.findApprovedByStoreNameSlug(candidate);
                if (seller) break;
            }
        }

        if (!seller) {
            throw new AppError('Store not found or unavailable', 404);
        }

        const [profile, products] = await Promise.all([
            dashboardService.getPublicSellerProfile(seller._id),
            sellerRepository.findEnabledProductsBySellerId(seller._id),
        ]);

        const categories = [...new Set(
            products
                .map((product) => product?.categoryId?.name)
                .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b));

        return {
            seller: profile,
            products: products.map((product) => ProductResponseDto.fromProduct(product)),
            categories,
        };
    }
}

export default new SellerService();
