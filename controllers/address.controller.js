import addressService from "../services/address.service.js";
import { asyncHandler } from "../utils/async-handler.util.js";
import ApiResponse from "../utils/response.util.js";

class AddressController {
    getUserAddresses = asyncHandler(async (req, res) => {
        const userId = req.params.userId;

        const addresses = await addressService.getUserAddresses(userId);
        if (!addresses) {
            return ApiResponse.error(res, 'Addresses Not Found', 404);
        }

        return ApiResponse.success(res, addresses, 'Addresses Found Successfully', 200);
    });

}

export default new AddressController();