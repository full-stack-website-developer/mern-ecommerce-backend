import { CreateOptionDto, OptionResponseDto } from "../dtos/option.dto.js";
import { CreateProductDto, ProductResponseDto } from "../dtos/product.dto.js";
import cloudinary from "../config/cloudinary.js";
import optionRepository from "../repositories/option.repository.js";
import productRepository from "../repositories/product.repository.js";
import reviewRepository from "../repositories/review.repository.js";
import variantRepository from "../repositories/variant.repository.js";
import { AppError } from "../utils/errors.util.js";

class ProductService {
   _isFlashSaleLive(flashSale = {}, now = new Date()) {
        const isActive = Boolean(flashSale?.isActive);
        const salePrice = Number(flashSale?.salePrice);
        const startAt = flashSale?.startAt ? new Date(flashSale.startAt) : null;
        const endAt = flashSale?.endAt ? new Date(flashSale.endAt) : null;

        if (!isActive || !Number.isFinite(salePrice) || salePrice <= 0) {
            return false;
        }

        if (!endAt || Number.isNaN(endAt.getTime()) || endAt <= now) {
            return false;
        }

        if (startAt && !Number.isNaN(startAt.getTime()) && startAt > now) {
            return false;
        }

        return true;
    }

   _withEffectivePrice(product) {
        const now = new Date();
        const price = Number(product?.price) || 0;
        const discount = Number(product?.discount) || 0;
        const discountedPrice = Number((price * (1 - discount / 100)).toFixed(2));
        const isFlashLive = this._isFlashSaleLive(product?.flashSale, now);
        const salePrice = Number(product?.flashSale?.salePrice);
        const effectivePrice = isFlashLive && Number.isFinite(salePrice) ? salePrice : discountedPrice;

        return {
            ...product,
            effectivePrice,
        };
    }

   async _attachReviewSummaryToProducts(products = []) {
        if (!Array.isArray(products) || products.length === 0) {
            return [];
        }

        const ratingMap = await reviewRepository.getAggregatedRatingForProducts(
            products.map((product) => product?._id || product?.id).filter(Boolean)
        );

        return products.map((product) => {
            const key = String(product?._id || product?.id || '');
            const summary = ratingMap[key] || { avgRating: 0, totalReviews: 0 };

            return {
                ...product,
                reviewSummary: summary,
            };
        });
    }

   _deriveBaseFieldsFromVariants(variants = []) {
        if (!Array.isArray(variants) || variants.length === 0) {
            return { basePrice: 0, totalQuantity: 0 };
        }

        const normalized = variants.map((variant) => ({
            price: Number(variant.price) || 0,
            quantity: Number(variant.quantity) || 0,
        }));

        const basePrice = Math.min(...normalized.map((variant) => variant.price));
        const totalQuantity = normalized.reduce((sum, variant) => sum + variant.quantity, 0);

        return { basePrice, totalQuantity };
    }

   /**
    * Ensure the authenticated seller owns the target product.
    * @param {{product: object}} productResult
    * @param {string} sellerId
    * @returns {void}
    */
   _assertSellerOwnsProduct(productResult, sellerId) {
        const ownerId = productResult?.product?.sellerId?._id || productResult?.product?.sellerId;
        if (!ownerId || String(ownerId) !== String(sellerId)) {
            throw new AppError('You do not have permission to modify this product', 403);
        }
    }

   /**
    * Build and persist product + variant updates from multipart payload.
    * @param {{values: object, mainImage?: object, additionalImages?: object[], user: object}} payload
    * @param {string} id
    * @returns {Promise<{product: object, variants: object[]}>}
    */
   async _buildAndPersistUpdate(payload, id) {
      const productData = new CreateProductDto(payload);

      // SKU validation — exclude own variants so unchanged SKUs don't block save
      if (productData.hasVariants && productData.variants.length > 0) {
          const variantSkus = productData.variants.map(v =>
              v.sku?.toUpperCase()?.trim()
          );

          const uniqueSkus = new Set(variantSkus);
          if (uniqueSkus.size !== variantSkus.length) {
              throw new AppError('Variant SKUs must be unique — duplicate found in submission', 400);
          }

          const takenVariants = await variantRepository.findBySkusExcludingProduct(variantSkus, id);
          if (takenVariants.length > 0) {
              const takenSkus = takenVariants.map(v => v.sku).join(', ');
              throw new AppError(`These variant SKUs are already taken: ${takenSkus}`, 409);
          }
      }

      // Build product fields
      const { variants, ...productFields } = productData;

      if (productData.hasVariants && productData.variants.length > 0) {
          const { basePrice, totalQuantity } = this._deriveBaseFieldsFromVariants(productData.variants);
          productFields.price = basePrice;
          productFields.quantity = totalQuantity;
      }

      const existingImages = payload?.values?.existingAdditionalImages
          ? JSON.parse(payload.values.existingAdditionalImages)
          : [];

      productFields.additionalImages = [
          ...existingImages,
          ...productData.additionalImages,
      ];

      const updatedProduct = await productRepository.updateById(productFields, id);

      // Variants — delete all then re-insert from submitted data.
      let updatedVariants = [];

      if (productData.hasVariants && productData.variants.length > 0) {
          await variantRepository.deleteManyByProductId(id);

          const variantDocs = productData.variants.map(v => ({
              productId: id,
              sku:       v.sku.toUpperCase().trim(),
              price:     Number(v.price),
              quantity:  Number(v.quantity),
              options:   v.options || [],
          }));

          updatedVariants = await variantRepository.insertMany(variantDocs);
      } else {
          await variantRepository.deleteManyByProductId(id);
      }

      return { product: updatedProduct, variants: updatedVariants };
    }

   async create(payload) {
        const productData = new CreateProductDto(payload);

        const existing = await productRepository.findBySku(productData.sku);
        if (existing) {
            throw new AppError('A product with this SKU already exists', 409);
        }

        if (productData.hasVariants && productData.variants.length > 0) {
            const variantSkus = productData.variants.map(v =>
                v.sku?.toUpperCase()?.trim()
            );

            const uniqueSkus = new Set(variantSkus);
            if (uniqueSkus.size !== variantSkus.length) {
                throw new AppError('Variant SKUs must be unique — duplicate found in submission', 400);
            }

            const takenVariants = await variantRepository.findBySkus(variantSkus);
            if (takenVariants.length > 0) {
                const takenSkus = takenVariants.map(v => v.sku).join(', ');
                throw new AppError(`These variant SKUs are already taken: ${takenSkus}`, 409);
            }
        }

        const { variants, ...productFields } = productData;

        if (productData.hasVariants && productData.variants.length > 0) {
            const { basePrice, totalQuantity } = this._deriveBaseFieldsFromVariants(productData.variants);
            productFields.price = basePrice;
            productFields.quantity = totalQuantity;
        }

        const newProduct = await productRepository.create(productFields);

        let newVariants = [];
        if (productData.hasVariants && productData.variants.length > 0) {
            const variantDocs = productData.variants.map(v => ({
                productId: newProduct._id,
                sku:       v.sku.toUpperCase().trim(),
                price:     Number(v.price),
                quantity:  Number(v.quantity),
                options:   v.options || [], 
            }));

            newVariants = await variantRepository.insertMany(variantDocs);
        }

        return {
            product:  newProduct,
            variants: newVariants,
        };
    }

    async update(payload, id) {
      const result = await productRepository.findById(id);
      if (!result) {
          throw new AppError('Product Not Found', 404);
      }

      return this._buildAndPersistUpdate(payload, id);
    }

    /**
     * Update a seller-owned product.
     * @param {string} sellerId
     * @param {string} productId
     * @param {object} data
     * @param {{mainImage?: object[], additionalImages?: object[]}} files
     * @returns {Promise<{product: object, variants: object[]}>}
     */
    async sellerUpdate(sellerId, productId, data, files) {
        const result = await productRepository.findById(productId);
        if (!result) {
            throw new AppError('Product Not Found', 404);
        }

        this._assertSellerOwnsProduct(result, sellerId);

        const payload = {
            values: data,
            mainImage: files?.mainImage?.[0],
            additionalImages: files?.additionalImages || [],
            user: {
                role: 'seller',
                sellerId,
            },
        };

        return this._buildAndPersistUpdate(payload, productId);
    }

    /**
     * Get all products with comprehensive filtering support
     * @param {Object} params - Query parameters for filtering, sorting, and pagination
     * @param {number} params.page - Page number for pagination
     * @param {number} params.limit - Number of items per page
     * @param {string} params.category - Category ID filter
     * @param {string} params.brand - Brand ID filter
     * @param {number} params.minPrice - Minimum price filter
     * @param {number} params.maxPrice - Maximum price filter
     * @param {string} params.search - Search term for name/description
     * @param {string} params.sort - Sort option (newest, price-low, price-high, rating, name)
     * @param {boolean} params.inStock - Filter for in-stock products only
     * @param {string} params.condition - Product condition filter
     * @param {number} params.minRating - Minimum rating filter
     * @param {string} params.seller - Seller ID filter
     * @param {boolean} params.onSale - Filter for products on sale
     * @param {boolean} params.freeShipping - Filter for free shipping products
     * @param {string} params.tags - Comma-separated tags filter
     * @returns {Promise<Object>} Filtered and paginated products with metadata
     */
    async getAll(params = {}) {
        const { products, total, page, totalPages } =
            await productRepository.all(params);
        const productsWithReviews = await this._attachReviewSummaryToProducts(products);
        const productsWithPricing = productsWithReviews.map((product) => this._withEffectivePrice(product));

        return {
            products: productsWithPricing.map(product =>
            ProductResponseDto.fromProduct(product)
            ),
            total,
            page,
            totalPages
        };
    }

    async getProductById(id) {
        const result = await productRepository.findById(id);
        if (!result) {
            throw new AppError('Product Not Found', 404);
        }

        const stats = await reviewRepository.getAggregatedRating(id);
        const productWithPrice = this._withEffectivePrice(result.product);

        return {
            ...result,
            product: {
                ...productWithPrice,
                reviewSummary: {
                    avgRating: Number(stats?.avgRating) || 0,
                    totalReviews: Number(stats?.totalReviews) || 0,
                },
            },
        };
    }

    async getBySellerId(sellerId) {
        const result = await productRepository.findBySellerId(sellerId);
        if (!result) {
            throw new AppError('Product Not Found', 404);
        }

        const productsWithReviews = await this._attachReviewSummaryToProducts(result.products || []);
        const productsWithPricing = productsWithReviews.map((product) => this._withEffectivePrice(product));
        return {
            ...result,
            products: productsWithPricing,
        };
    }

    async getFlashSaleProducts() {
        const products = await productRepository.findFlashSaleProducts();
        const productsWithReviews = await this._attachReviewSummaryToProducts(products);
        const productsWithPricing = productsWithReviews
            .map((product) => this._withEffectivePrice(product))
            .filter((product) => this._isFlashSaleLive(product.flashSale));

        return productsWithPricing.map((product) => ProductResponseDto.fromProduct(product));
    }

    async setFlashSale(productId, { isActive, salePrice, startAt, endAt }) {
        const result = await productRepository.findById(productId);
        if (!result) {
            throw new AppError('Product Not Found', 404);
        }

        const now = new Date();
        const update = {
            flashSale: {
                isActive: Boolean(isActive),
                salePrice: null,
                startAt: null,
                endAt: null,
            },
        };

        if (Boolean(isActive)) {
            const parsedSalePrice = Number(salePrice);
            const parsedStartAt = new Date(startAt);
            const parsedEndAt = new Date(endAt);
            const basePrice = Number(result.product?.price) || 0;

            if (!Number.isFinite(parsedSalePrice) || parsedSalePrice <= 0) {
                throw new AppError('salePrice must be a valid positive number', 400);
            }

            if (!(parsedSalePrice < basePrice)) {
                throw new AppError('salePrice must be less than product price', 400);
            }

            if (Number.isNaN(parsedStartAt.getTime()) || Number.isNaN(parsedEndAt.getTime())) {
                throw new AppError('startAt and endAt must be valid dates', 400);
            }

            if (!(parsedStartAt > now)) {
                throw new AppError('startAt must be in the future', 400);
            }

            if (!(parsedEndAt > parsedStartAt)) {
                throw new AppError('endAt must be greater than startAt', 400);
            }

            update.flashSale = {
                isActive: true,
                salePrice: parsedSalePrice,
                startAt: parsedStartAt,
                endAt: parsedEndAt,
            };
        }

        const updated = await productRepository.updateById(update, productId);
        return this._withEffectivePrice(updated?.toObject ? updated.toObject() : updated);
    }

    async delete(id) {
        const product = await productRepository.deleteById(id);
        
        if (!product) {
            throw new AppError('Product Not Found', 404);
        }

        return product;
    }

    /**
     * Delete a seller-owned product and cleanup uploaded images.
     * @param {string} sellerId
     * @param {string} productId
     * @returns {Promise<object>}
     */
    async sellerDelete(sellerId, productId) {
        const result = await productRepository.findById(productId);
        if (!result) {
            throw new AppError('Product Not Found', 404);
        }

        this._assertSellerOwnsProduct(result, sellerId);

        const mainPublicId = result.product?.mainImage?.publicId;
        if (mainPublicId) {
            await cloudinary.uploader.destroy(mainPublicId);
        }

        const additionalImages = Array.isArray(result.product?.additionalImages)
            ? result.product.additionalImages
            : [];

        await Promise.all(
            additionalImages
                .map((image) => image?.publicId)
                .filter(Boolean)
                .map((publicId) => cloudinary.uploader.destroy(publicId))
        );

        await variantRepository.deleteManyByProductId(productId);
        const deletedProduct = await productRepository.deleteById(productId);

        if (!deletedProduct) {
            throw new AppError('Product Not Found', 404);
        }

        return deletedProduct;
    }
    /**
     * Get available filter options for products
     * @returns {Promise<Object>} Available categories, brands, price ranges, and tags
     */
    async getFilterOptions() {
        return await productRepository.getFilterOptions();
    }
}

export default new ProductService();
