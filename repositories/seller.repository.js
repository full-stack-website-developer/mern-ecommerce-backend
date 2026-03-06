import Seller from '../models/seller.model.js';
import Product from '../models/product.model.js';
import AppSetting from '../models/app-setting.model.js';

const slugify = (value = '') =>
    String(value)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

class SellerRepository {
    async create(sellerData) {
        return await Seller.create(sellerData);
    }

    async getByUserId(userId) {
        return await Seller.findOne({ userId });
    }

    async all(withUser = false) {
        const query = Seller.find();
        if (withUser) {
            query.populate('userId');
        }
        return await query;
    }

    async findById(id) {
        return await Seller.findById(id);
    }

    async findApprovedById(id) {
        return Seller.findOne({ _id: id, status: 'approved' }).lean();
    }

    async findSellerIdByProfileSlug(slug) {
        const safeSlug = slugify(slug);
        if (!safeSlug) return null;

        const doc = await AppSetting.findOne({
            key: { $regex: /^seller:profile:/ },
            'value.storeSlug': { $regex: new RegExp(`^${safeSlug}$`, 'i') },
        })
            .select('key')
            .lean();

        if (!doc?.key) return null;
        return String(doc.key).replace('seller:profile:', '');
    }

    async findApprovedByStoreNameSlug(slug) {
        const sellers = await Seller.find({ status: 'approved' })
            .select('_id storeName logo status createdAt')
            .lean();
        return sellers.find((seller) => slugify(seller.storeName) === slug) || null;
    }

    async findEnabledProductsBySellerId(sellerId) {
        return Product.find({ sellerId, status: 'enabled' })
            .populate('categoryId', 'name')
            .sort({ createdAt: -1 })
            .lean();
    }

    async save(seller) {
        return await seller.save();
    }
}

export default new SellerRepository();
