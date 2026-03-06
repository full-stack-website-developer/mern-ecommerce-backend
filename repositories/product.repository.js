import Product from '../models/product.model.js';
import Variant from '../models/variant.model.js';
import { buildFilter, buildSort } from '../utils/query.util.js';

class ProductRepository {
    async create(product) {
        return await Product.create(product);
    }

    async findById(id) {
        const product = await Product.findById(id)
            .populate('categoryId', 'name')
            .populate('brandId', 'name')
            .populate('sellerId', 'storeName logo')
            .populate('options.optionId')
            .lean();
        
        if (!product) return null;
        
        const enriched = await this._enrichWithVariants([product]);
        return { product: enriched[0] };
    }

    async findBySku(sku) {
        return await Product.findOne({ sku }).lean();
    }

    async findBySellerId(sellerId) {
        const products = await Product.find({ sellerId })
            .populate('categoryId', 'name')
            .populate('brandId', 'name')
            .populate('options.optionId')
            .sort({ createdAt: -1 })
            .lean();
        
        const enriched = await this._enrichWithVariants(products);
        return enriched.length > 0 ? enriched : null;
    }

    async findFlashSaleProducts() {
        const products = await Product.find({
            status: 'enabled',
            'flashSale.isActive': true,
            'flashSale.endAt': { $gt: new Date() }
        })
            .populate('categoryId', 'name')
            .populate('brandId', 'name')
            .populate('sellerId', 'storeName logo')
            .populate('options.optionId')
            .sort({ 'flashSale.startAt': -1 })
            .lean();
        
        return await this._enrichWithVariants(products);
    }

    /**
     * Get all products with comprehensive filtering, sorting, and pagination
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} Products with pagination metadata
     */
    async all({ 
        page = 1, 
        limit = 24, 
        category, 
        brand,
        minPrice, 
        maxPrice, 
        search,
        sort,
        inStock,
        seller,
        onSale,
        tags
    } = {}) {
        const filter = this._buildComprehensiveFilter({
            category,
            brand,
            minPrice,
            maxPrice,
            search,
            inStock,
            seller,
            onSale,
            tags
        });

        const sortOptions = this._buildSortOptions(sort);
        const skip = (page - 1) * limit;

        const total = await Product.countDocuments(filter);
        const products = await this._enrichWithVariants(
            await Product.find(filter)
                .populate('categoryId', 'name')
                .populate('brandId', 'name')
                .populate('sellerId', 'storeName logo')
                .populate('options.optionId')
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .lean()
        );
        
        return { products, total, page, totalPages: Math.ceil(total / limit) };
    }

    async updateById(data, id) {
        return await Product.findByIdAndUpdate(id, data, { new: true })
            .populate('categoryId', 'name')
            .populate('brandId', 'name')
            .populate('sellerId', 'storeName logo')
            .populate('options.optionId');
    }

    async deleteById(id) {
        return await Product.findByIdAndDelete(id);
    }

    async decreaseProductStock(productId, quantity) {
        const result = await Product.updateOne(
            { _id: productId, quantity: { $gte: quantity } },
            { $inc: { quantity: -quantity } }
        );
        return result.modifiedCount > 0;
    }

    async increaseProductStock(productId, quantity) {
        await Product.updateOne(
            { _id: productId },
            { $inc: { quantity: quantity } }
        );
    }

    /**
     * Build comprehensive filter object for product queries
     * @param {Object} params - Filter parameters
     * @returns {Object} MongoDB filter object
     */
    _buildComprehensiveFilter({
        category,
        brand,
        minPrice,
        maxPrice,
        search,
        inStock,
        seller,
        onSale,
        tags
    }) {
        const filter = { status: 'enabled' };

        // Category filter
        if (category) {
            filter.categoryId = category;
        }

        // Brand filter
        if (brand) {
            filter.brandId = brand;
        }

        // Price range filter
        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.price = {};
            if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
            if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
        }

        // Search filter (name, description, tags)
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { shortDescription: { $regex: search, $options: 'i' } },
                { longDescription: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        // Stock filter
        if (inStock === true || inStock === 'true') {
            filter.quantity = { $gt: 0 };
        }

        // Seller filter
        if (seller) {
            filter.sellerId = seller;
        }

        // On sale filter (products with discount or flash sale)
        if (onSale === true || onSale === 'true') {
            filter.$or = [
                { discount: { $gt: 0 } },
                { 'flashSale.isActive': true, 'flashSale.endAt': { $gt: new Date() } }
            ];
        }

        // Tags filter
        if (tags) {
            const tagArray = tags.split(',').map(tag => tag.trim());
            filter.tags = { $in: tagArray };
        }

        return filter;
    }

    /**
     * Build sort options for product queries
     * @param {string} sort - Sort option
     * @returns {Object} MongoDB sort object
     */
    _buildSortOptions(sort) {
        switch (sort) {
            case 'price-low':
                return { price: 1 };
            case 'price-high':
                return { price: -1 };
            case 'name':
                return { name: 1 };
            case 'oldest':
                return { createdAt: 1 };
            case 'newest':
            default:
                return { createdAt: -1 };
        }
    }

    /**
     * Enrich products with variant information
     * @param {Array} products - Array of products
     * @returns {Promise<Array>} Products enriched with variant data
     */
    async _enrichWithVariants(products) {
        const variantProductIds = products
            .filter(p => p.hasVariants)
            .map(p => p._id);

        let variantStockMap = {};
        let variantsByProductId = {};

        if (variantProductIds.length > 0) {
            const stockSummaries = await Variant.aggregate([
                {
                    $match: {
                        productId: { $in: variantProductIds },
                        isActive: true,
                    }
                },
                {
                    $group: {
                        _id: "$productId",
                        totalStock: { $sum: "$quantity" },
                        variantCount: { $sum: 1 },
                        minPrice: { $min: "$price" },
                    }
                }
            ]);

            stockSummaries.forEach(summary => {
                variantStockMap[summary._id.toString()] = {
                    totalStock: summary.totalStock,
                    variantCount: summary.variantCount,
                    minPrice: summary.minPrice,
                };
            });

            const variants = await Variant.find({
                productId: { $in: variantProductIds },
                isActive: true,
            }).lean();

            variants.forEach(variant => {
                const key = variant.productId.toString();
                if (!variantsByProductId[key]) {
                    variantsByProductId[key] = [];
                }
                variantsByProductId[key].push(variant);
            });
        }

        return products.map(product => {
            const productId = product._id.toString();
            const variantInfo = variantStockMap[productId];
            const variants = variantsByProductId[productId] || [];

            if (product.hasVariants && variantInfo) {
                const { totalStock, variantCount, minPrice } = variantInfo;
                return {
                    ...product,
                    price: minPrice,
                    quantity: totalStock,
                    stockLabel: `${totalStock.toLocaleString()} in stock for ${variantCount} variant${variantCount !== 1 ? 's' : ''}`,
                    totalStock,
                    variantCount,
                    variants,
                };
            }

            return {
                ...product,
                stockLabel: `${product.quantity.toLocaleString()} in stock`,
                variants: [],
            };
        });
    }

    /**
     * Get filter options for products (categories, brands, price range, tags)
     * @returns {Promise<Object>} Filter options with counts
     */
    async getFilterOptions() {
        const [categories, brands, priceRange, tags] = await Promise.all([
            // Get categories with product counts
            Product.aggregate([
                { $match: { status: 'enabled' } },
                { $group: { _id: '$categoryId', count: { $sum: 1 } } },
                { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
                { $unwind: '$category' },
                { $project: { _id: 1, name: '$category.name', count: 1 } },
                { $sort: { name: 1 } }
            ]),

            // Get brands with product counts
            Product.aggregate([
                { $match: { status: 'enabled', brandId: { $exists: true, $ne: null } } },
                { $group: { _id: '$brandId', count: { $sum: 1 } } },
                { $lookup: { from: 'brands', localField: '_id', foreignField: '_id', as: 'brand' } },
                { $unwind: '$brand' },
                { $project: { _id: 1, name: '$brand.name', count: 1 } },
                { $sort: { name: 1 } }
            ]),

            // Get price range
            Product.aggregate([
                { $match: { status: 'enabled' } },
                { $group: { _id: null, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } }
            ]),

            // Get popular tags with counts
            Product.aggregate([
                { $match: { status: 'enabled', tags: { $exists: true, $ne: [] } } },
                { $unwind: '$tags' },
                { $group: { _id: '$tags', count: { $sum: 1 } } },
                { $project: { name: '$_id', count: 1, _id: 0 } },
                { $sort: { count: -1, name: 1 } },
                { $limit: 50 }
            ])
        ]);

        return {
            categories: categories || [],
            brands: brands || [],
            priceRange: priceRange[0] || { minPrice: 0, maxPrice: 1000 },
            tags: tags || []
        };
    }
}

export default new ProductRepository();