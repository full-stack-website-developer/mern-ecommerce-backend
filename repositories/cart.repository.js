import Cart from "../models/cart.model.js";

class CartRepository {
  // ✅ Create cart (returns mongoose doc)
  create(cart) {
    return Cart.create(cart);
  }

  // ✅ Write-safe: returns mongoose doc
  async findDocByUserId(userId) {
    return Cart.findOne({ userId });
  }

  // ✅ Update cart by id (returns mongoose doc)
  updateById(cart, id) {
    return Cart.findByIdAndUpdate(
      id,
      { $set: cart },
      { new: true, runValidators: true }
    );
  }

  // ✅ Read-safe: returns formatted plain object
  async findByUserId(userId) {
    const cart = await Cart.findOne({ userId })
      .populate("items.productId", "name mainImage slug")
      .populate({
        path: "items.variantId",
        populate: {
          path: "options.optionId",
          model: "Option",
        },
      })
      .lean();

    if (!cart) {
      return {
        userId,
        items: [],
      };
    }

    cart.items = cart.items.map((item) => {
      if (!item.variantId || !Array.isArray(item.variantId.options)) {
        return {
          ...item,
          variantId: null,
        };
      }

      return {
        ...item,
        variantId: {
          ...item.variantId,
          options: item.variantId.options.map((opt) => {
            const option = opt.optionId;

            if (!option || !Array.isArray(option.values)) {
              return {
                optionId: null,
                optionName: null,
                selectedValue: null,
              };
            }

            const selectedValue = option.values.find(
              (v) => String(v._id) === String(opt.valueId)
            );

            return {
              optionId: option._id,
              optionName: option.name,
              selectedValue: selectedValue
                ? { id: selectedValue._id, label: selectedValue.label }
                : null,
            };
          }),
        },
      };
    });

    return cart;
  }

  // ❗ for admin/debug only (returns mongoose docs)
  async all() {
    return Cart.find();
  }

  // ✅ Remove item and return formatted cart
  async removeItem(userId, itemId) {
    await Cart.findOneAndUpdate(
      { userId },
      { $pull: { items: { _id: itemId } } },
      { new: true }
    );

    // Always return formatted cart to frontend
    return this.findByUserId(userId);
  }

  async updateItemQuantity(userId, itemId, quantity) {
    await Cart.findOneAndUpdate(
      { userId, "items._id": itemId },
      { $set: { "items.$.quantity": quantity } },
      { new: true }
    );

    // Always return formatted cart to frontend
    return this.findByUserId(userId);
  }

  async removeItems(userId) {
    return Cart.findOneAndUpdate(
      { userId: userId },
      { $set: { items: [] } }
    );
  }
}

export default new CartRepository();