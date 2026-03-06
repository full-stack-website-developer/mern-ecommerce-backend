import Variant from "../models/variant.model.js";

class VariantRepository {

  async create(variant) {
    return await Variant.create(variant);
  }

  async insertMany(variants) {
    return await Variant.insertMany(variants);
  }

  async findByProductId(productId) {
    return await Variant.find({ productId });
  }

  async findById(id) {
    return await Variant.findById(id);
  }

  async findBySkus(skus) {
    return await Variant.find({ sku: { $in: skus } }).select('sku productId');
  }

  async findBySkusExcludingProduct(skus, productId) {
    return await Variant.find({
      sku: { $in: skus },
      productId: { $ne: productId },
    }).select('sku productId');
  }

  async updateById(data, id) {
    return await Variant.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async deleteManyByProductId(productId) {
    return await Variant.deleteMany({ productId });
  }

  // ✅ Used when user removes variants in edit mode
  async deleteManyByIds(ids) {
    return await Variant.deleteMany({ _id: { $in: ids } });
  }

  async deleteById(id) {
    return await Variant.findByIdAndDelete(id);
  }

  async decreaseVariantStock(variantId, qty) {
    const res = await Variant.updateOne(
      { _id: variantId, quantity: { $gte: qty }, isActive: true },
      { $inc: { quantity: -qty } }
    );
    return res.modifiedCount === 1;
  }

  async increaseVariantStock(variantId, qty) {
    return Variant.updateOne(
      { _id: variantId },
      { $inc: { quantity: qty } }
    );
  }
}

export default new VariantRepository();