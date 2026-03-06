class CreateProductDto {
  constructor({ values = {}, mainImage, additionalImages = [], user }) {
    if (!values) values = {};

    this.name             = values.name?.trim() || '';
    this.shortDescription = values.shortDescription?.trim() || '';
    this.longDescription  = values.longDescription?.trim() || '';
    this.sku              = values.sku?.toUpperCase()?.trim() || '';

    // Main image
    mainImage && (this.mainImage = {
      url:      mainImage.path     || '',
      publicId: mainImage.filename || '',
    });

    // Additional images
    if (Array.isArray(additionalImages)) {
      this.additionalImages = additionalImages.map(img => ({
        url:      img.path     || '',
        publicId: img.filename || '',
      }));
    }

    this.price    = Number(values.price)    || 0;
    this.quantity = Number(values.quantity) || 0;

    // hasVariants — sent as JSON string "true"/"false" from FormData
    this.hasVariants = values.hasVariants === 'true' || values.hasVariants === true;

    // Options array safely parsed
    try {
      this.options = typeof values.selectedOptions === 'string'
        ? JSON.parse(values.selectedOptions)
        : Array.isArray(values.selectedOptions)
        ? values.selectedOptions
        : [];
    } catch (err) {
      this.options = [];
    }

    // Variants array safely parsed
    // Each item: { sku, price, quantity, options: [{ optionId, valueId }] }
    // Only present when hasVariants = true
    // Service layer creates one Variant document per item
    try {
      this.variants = typeof values.variants === 'string'
        ? JSON.parse(values.variants)
        : Array.isArray(values.variants)
        ? values.variants
        : [];
    } catch (err) {
      this.variants = [];
    }

    this.discount   = Number(values.discount) || 0;
    this.brandId    = values.brand || process.env.DEFAULT_BRAND_ID;
    if (user.role === 'seller') {
      this.sellerId = user.sellerId;
    }
    this.categoryId = values.categoryId || null;

    // Tags safely parsed
    try {
      this.tags = typeof values.tags === 'string'
        ? JSON.parse(values.tags)
        : Array.isArray(values.tags)
        ? values.tags
        : [];
    } catch (err) {
      this.tags = [];
    }

    this.status = values.status || 'enabled';
  }
}

class ProductResponseDto {
  static fromProduct(product) {
    return {
      id:          product._id,
      name:        product.name,
      category:    product.categoryId,
      price:       product.price,
      stock:       product.quantity,
      hasVariants: product.hasVariants,
      inStock:     product.inStock,
      stockLabel:  product.stockLabel,
      status:  product.status,
      image:  product.mainImage.url,
      flashSale: product.flashSale,
      effectivePrice: Number(product.effectivePrice) || 0,
      options:  product.options,
      variants:  product.variants,
      sellerId:  product?.sellerId,
      reviewSummary: {
        avgRating: Number(product?.reviewSummary?.avgRating) || 0,
        totalReviews: Number(product?.reviewSummary?.totalReviews) || 0,
      },
    };
  }
}

export { ProductResponseDto, CreateProductDto };
