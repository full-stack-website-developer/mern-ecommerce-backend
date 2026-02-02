import { asyncHandler } from "../utils/async-handler.util.js";
import userService from "../services/user.service.js";
import ApiResponse from "../utils/response.util.js";

class UserController{
    getMe = asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const user = await userService.getUser(userId);
        
        return ApiResponse.success(res, user, 'User Found Successfully', 200)
    })

    updatePersonalInfo = asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const data = await userService.editInfo(userId, req.body);

        return ApiResponse.success(res, data, 'User Updated Successfully', 200);
    })

    updateAddress = asyncHandler(async (req, res) => {
        const id = req.params.id;
        const address = await userService.updateAddress(id, req.body);

        return ApiResponse.success(res, address, 'Address Updated Successfully', 200);
    })

    getAddress = asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const address = await userService.getAddress(userId);

        if (!address) {
            return ApiResponse.success(res, null, 'No Address Found', 200);
        }

        return ApiResponse.success(res, address, 'User Updated Successfully', 200);
    })

    createAddress = asyncHandler(async (req, res) => {
        const userId = req.user.id;
        
        const data = await userService.createAddress(userId, req.body);

        return ApiResponse.success(res, data, 'Address Created Successfully', 200);
    })

    changePassword = asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const user = await userService.changePassword(userId, req.body);

        return ApiResponse.success(res, user, 'Password Updated Successfully', 200);
    })

    updateAvatar = asyncHandler(async (req, res) => {
        const file = req.file;
        const userId = req.user.id;

        const user = await userService.updateAvatar(userId, file)

        return ApiResponse.success(res, user, 'User Profile Image Updated Successfully', 200);
    })

    createPassword = asyncHandler(async (req, res) => {
        const userId = req.user.id;
        
        await userService.createPassword(userId, req.body.newPassword);

        return ApiResponse.success(res, null, 'Password Created Successfully', 200);
    })
}

export default new UserController();