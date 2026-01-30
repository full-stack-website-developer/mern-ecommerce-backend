import userService from '../services/user.service.js';
import { asyncHandler } from '../utils/async-handler.util.js';
import ApiResponse from '../utils/response.util.js';

class UserController {
    register = asyncHandler(async (req, res)  => {
        const result = await userService.register(req.body);

        return ApiResponse.success(res, result, 'Registration successful', 201);
    });

    login = asyncHandler(async (req, res)  => {
        const { email, password } = req.body;
        const result = await userService.login(email, password);

        return ApiResponse.success(res, result, 'login successful', 201);
    });

    verifyToken = asyncHandler(async (req, res)  => {
        return ApiResponse.success(res, {user: req.user}, 'Token Verified successful', 200);
    });

    forgotPassword = asyncHandler(async (req, res) => {
        const { email } = req.body;
        const result = await userService.forgotPassword(email);

        return ApiResponse.success(res, result, 'OTP sent successfully', 200);
    });

    verifyOTP = asyncHandler(async (req, res) => {
        const { otp } = req.body;
        const email = req.params.email;

        await userService.verifyOTP(email, otp);

        return ApiResponse.success(res, null, 'OTP Verified successfully', 200);
    });

    changePassword = asyncHandler(async (req, res) => {
        const { password, confirmPassword } = req.body;
        const email = req.params.email;

        await userService.changePassword(password, confirmPassword, email);

        return ApiResponse.success(res, null, 'Password Changes Successfully', 200);
    });

    googleLogin = asyncHandler(async (req, res) => {
        const code  = req.params.code;
        const result = await userService.googleLogin(code);

        return ApiResponse.success(res, result, 'Logged In Successfully', 200);
    });
}


export default new UserController();
