import dashboardRepository from '../repositories/dashboard.repository.js';
import { AppError } from '../utils/errors.util.js';

class CouponService {
  _defaultCoupons() {
    return [];
  }

  async getCoupons() {
    return dashboardRepository.getSetting('admin:coupons', this._defaultCoupons());
  }

  async saveCoupons(coupons = []) {
    const normalized = (coupons || []).map((coupon) => ({
      code: String(coupon.code || '').trim().toUpperCase(),
      type: coupon.type === 'fixed' ? 'fixed' : 'percent',
      value: Number(coupon.value || 0),
      minOrder: Number(coupon.minOrder || 0),
      maxDiscount: coupon.maxDiscount === null || coupon.maxDiscount === undefined ? null : Number(coupon.maxDiscount),
      active: coupon.active !== false,
      startsAt: coupon.startsAt || null,
      expiresAt: coupon.expiresAt || null,
      usageLimit: coupon.usageLimit === null || coupon.usageLimit === undefined ? null : Number(coupon.usageLimit),
      usedCount: Number(coupon.usedCount || 0),
    })).filter((coupon) => coupon.code);

    const saved = await dashboardRepository.setSetting('admin:coupons', normalized);
    return saved.value;
  }

  _isCouponWindowValid(coupon) {
    const now = new Date();
    if (coupon.startsAt && new Date(coupon.startsAt) > now) return false;
    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) return false;
    return true;
  }

  _computeDiscount(coupon, subtotal) {
    if (coupon.type === 'fixed') return Math.min(coupon.value, subtotal);
    const percentDiscount = subtotal * (coupon.value / 100);
    if (coupon.maxDiscount == null) return percentDiscount;
    return Math.min(percentDiscount, coupon.maxDiscount);
  }

  async validateCoupon(code, subtotal = null) {
    if (!code) throw new AppError('Coupon code is required', 400);

    const coupons = await this.getCoupons();
    const coupon = coupons.find((item) => String(item.code).toUpperCase() === String(code).trim().toUpperCase());

    if (!coupon) throw new AppError('Invalid or expired coupon', 400);
    if (!coupon.active) throw new AppError('Coupon is inactive', 400);
    if (!this._isCouponWindowValid(coupon)) throw new AppError('Coupon is expired or not active yet', 400);
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new AppError('Coupon usage limit reached', 400);
    }

    if (subtotal != null && subtotal < (coupon.minOrder || 0)) {
      throw new AppError(`Minimum order amount is ${coupon.minOrder}`, 400);
    }

    return {
      code: coupon.code,
      type: coupon.type,
      discount: coupon.value,
      amount: subtotal != null ? this._computeDiscount(coupon, subtotal) : null,
      minOrder: coupon.minOrder || 0,
      maxDiscount: coupon.maxDiscount,
    };
  }

  async validateAndComputeDiscount(code, subtotal) {
    if (!code) return { coupon: null, discountAmount: 0 };
    const coupon = await this.validateCoupon(code, subtotal);
    return { coupon, discountAmount: Number(coupon.amount || 0) };
  }

  async incrementUsage(code) {
    if (!code) return;

    const coupons = await this.getCoupons();
    const updated = coupons.map((coupon) => {
      if (String(coupon.code).toUpperCase() !== String(code).trim().toUpperCase()) return coupon;
      return { ...coupon, usedCount: Number(coupon.usedCount || 0) + 1 };
    });

    await this.saveCoupons(updated);
  }
}

export default new CouponService();
