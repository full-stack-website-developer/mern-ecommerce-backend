import sellerRepository from "../repositories/seller.repository.js";
import userRepository from "../repositories/user.repository.js";
import { AppError } from "../utils/errors.util.js";

class AdminService {
    async updateSellerStatus(id, status) {
        const seller = await sellerRepository.findById(id);
        if (!seller) {
            throw new AppError('Seller Not Found', 404);
        }
        
        const user = await userRepository.findById(seller.userId);
        user.role = "seller";
        await userRepository.save(user);

        seller.status = status;
        await sellerRepository.save(seller);

        return {
            id: seller._id,
            userId: seller.userId,
            status: seller.status,
        };
    }

    async listUsers({ page = 1, limit = 10, role, status, search } = {}) {
        return userRepository.listWithFilters({ page, limit, role, status, search });
    }
}

export default new AdminService();