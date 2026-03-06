// services/stock.service.js
import productRepository from '../repositories/product.repository.js';
import variantRepository from '../repositories/variant.repository.js';
import { AppError } from '../utils/errors.util.js';

class StockService {

  async decreaseForOrder(order) {
    if (!order.subOrder?.length) return;

    for (const sub of order.subOrder) {
      if (!sub.items?.length) continue;

      for (const item of sub.items) {
        if (item.variantId) {
          const ok = await variantRepository.decreaseVariantStock(item.variantId, item.quantity);
          if (!ok) throw new AppError(`Variant ${item.variantId} out of stock`, 409);
        } else {
          const ok = await productRepository.decreaseProductStock(item.productId, item.quantity);
          if (!ok) throw new AppError(`Product ${item.productId} out of stock`, 409);
        }
      }
    }
  }

  async restoreForOrder(order) {
    if (!order.subOrder?.length) return;

    for (const sub of order.subOrder) {
      if (!sub.items?.length) continue;

      for (const item of sub.items) {
        if (item.variantId) {
          await variantRepository.increaseVariantStock(item.variantId, item.quantity);
        } else {
          await productRepository.increaseProductStock(item.productId, item.quantity);
        }
      }
    }
  }

  async _getProductForOrder(productId, variantId = null) {
    const result = await productRepository.findById(productId);

    if (!result?.product || result.product.status !== 'enabled') {
        throw new AppError('Product is unavailable', 400);
    }

    // ── Product without variants ─────────────────────
    if (!result.product.hasVariants) {
        if (result.product.quantity < 1)
        throw new AppError('Product is out of stock', 400);

        return {
            price: result.product.price,
            quantity: result.product.quantity,
            sellerId: result.product.sellerId,
            productId: result.product._id,
            variantId: null
        };
    }

    // ── Product with variants ────────────────────────
    if (!variantId)
        throw new AppError('Variant is required for this product', 400);

    const variants = Array.isArray(result.product.variants) ? result.product.variants : [];

    const variant = variants.find(v =>
        v._id.toString() === variantId.toString() && v.isActive
    );

    if (!variant)
        throw new AppError('Selected variant is unavailable', 400);

    if (variant.quantity < 1)
        throw new AppError('Selected variant is out of stock', 400);

    return {
        price: variant.price,
        quantity: variant.quantity,
        sellerId: result.product.sellerId,
        productId: result.product._id,
        variantId: variant._id
    };
  }
}

export default new StockService();