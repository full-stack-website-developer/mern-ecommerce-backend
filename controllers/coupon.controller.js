import couponService from '../services/coupon.service.js';
import { asyncHandler } from '../utils/async-handler.util.js';
import ApiResponse from '../utils/response.util.js';

class CouponController {
  validate = asyncHandler(async (req, res) => {
    const { code, subtotal } = req.query;
    const parsedSubtotal = subtotal != null ? Number(subtotal) : null;
    const coupon = await couponService.validateCoupon(code, Number.isFinite(parsedSubtotal) ? parsedSubtotal : null);
    return ApiResponse.success(res, coupon, 'Coupon validated');
  });
}

export default new CouponController();
