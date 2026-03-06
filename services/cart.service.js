import cartRepository from "../repositories/cart.repository.js";
import Product from "../models/product.model.js";
import Variant from "../models/variant.model.js";
import { AppError } from "../utils/errors.util.js";

class CartService {
    async addItem({ userId, item }) {
        const cart = await cartRepository.findDocByUserId(userId);

        if (!cart) {
            return cartRepository.create({
                userId,
                items: [item],
            });
        }

        const existingItemIndex = cart.items.findIndex(i =>
            i.productId.toString() === item.productId.toString() &&
            (i.variantId?.toString() === item.variantId?.toString())
        );

        if (existingItemIndex !== -1) {
            cart.items[existingItemIndex].quantity += item.quantity;
        } else {
            cart.items.push(item);
        }

        return cart.save();
    }

    async bulkAddItems({ userId, items }) {
        const cart = await cartRepository.findDocByUserId(userId);

        if (!cart) {
            return cartRepository.create({
                userId,
                items,
            });
        }

        // Merge items with existing cart
        items.forEach(newItem => {
            const existingIndex = cart.items.findIndex(i =>
                i.productId.toString() === newItem.productId.toString() &&
                (i.variantId?.toString() === newItem.variantId?.toString())
            );

            if (existingIndex !== -1) {
                cart.items[existingIndex].quantity += newItem.quantity;
            } else {
                cart.items.push(newItem);
            }
        });

        return cart.save();
    }

    async updateItemQuantity(itemId, userId, quantity) {
        if (!quantity || quantity < 1) {
            throw new AppError("Quantity must be at least 1", 400);
        }

        const result = await cartRepository.updateItemQuantity(userId, itemId, quantity);
        if (!result) {
            throw new AppError("Cart item not found", 404);
        }

        return result;
    }
    
    async getCart() {
        return cartRepository.all();
    }

    async getByUserId(id) {
        return cartRepository.findByUserId(id);
    }

    async preview(items) {
        if (!Array.isArray(items) || items.length === 0) {
        throw new AppError("Invalid cart payload", 400);
        }

        const previewItems = [];
        let total = 0;

        for (const item of items) {
            const product = await Product.findById(item.productId)
                .select("name mainImage hasVariants price quantity sellerId")
                .lean();
            if (!product) continue;

            let stock, price, formattedVariant = null;

            // Handle variants
            if (product.hasVariants) {
                if (!item.variantId) continue;

                const variantDoc = await Variant.findOne({
                    _id: item.variantId,
                    productId: product._id,
                    isActive: true
                })
                .populate({ path: "options.optionId", model: "Option" })
                .lean();

                if (!variantDoc) continue;

                price = variantDoc.price;
                stock = variantDoc.quantity;

                formattedVariant = {
                _id: variantDoc._id,
                options: (variantDoc.options || []).map(opt => {
                    const option = opt.optionId;
                    const selectedValue = option?.values?.find(
                    v => String(v._id) === String(opt.valueId)
                    );

                    return {
                    optionId: option?._id || null,
                    optionName: option?.name || null,
                    selectedValue: selectedValue
                        ? { id: selectedValue._id, label: selectedValue.label }
                        : null
                    };
                })
                };
            } else {
                price = product.price;
                stock = product.quantity;
            }

            // ✅ Use either item.qty (backend) or item.quantity (guest)
            const qty = item.quantity;
            // const qty = Math.min(item.qty ?? item.quantity ?? 1, stock);
            const subtotal = price * qty;

            previewItems.push({
                _id: item._id ?? null,
                productId: { ...product, _id: product._id },
                variantId: formattedVariant,
                price,
                quantity: qty,          // ✅ match login cart
                availableStock: stock,
                inStock: stock > 0,
                subtotal,
                hasVariants: product.hasVariants,
                name: product.name,
                thumbnail: product.mainImage
            });

            total += subtotal;
        }

        return { items: previewItems, total };
    }

    async delete(id, userId) {
        const item = await cartRepository.removeItem(userId, id);
        if (!item) {
            throw new AppError('Item Not Found', 404);
        }

        return item;
    }

    async clearCart(userId) {
        const item = await cartRepository.removeItems(userId);
        if (!item) {
            throw new AppError('Item Not Found', 404);
        }

        return item;
    }
    
}

export default new CartService();