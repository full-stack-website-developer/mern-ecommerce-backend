import sellerService from "../services/seller.service.js";
import { asyncHandler } from "../utils/async-handler.util.js";
import ApiResponse from '../utils/response.util.js';

class SellerController {
    apply = asyncHandler(async (req, res) => {
        const seller = await sellerService.apply(req);

        return ApiResponse.success(res, seller, 'Seller Created successfully', 200);
    })

    getSellers = asyncHandler(async (req, res) => {
        const sellers = await sellerService.getAll();
        
        return ApiResponse.success(res, sellers, 'All Sellers Fetched Successfully', 200);
    })

    getPublicStoreBySlug = asyncHandler(async (req, res) => {
        const data = await sellerService.getPublicStoreBySlug(req.params.sellerSlug);
        return ApiResponse.success(res, data, 'Store fetched successfully', 200);
    })
}

export default new SellerController();
