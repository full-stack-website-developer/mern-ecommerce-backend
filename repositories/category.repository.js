import Category from '../models/category.model.js';

class CategoryRepository {
    async findParentByNameOrSlug(name, slug, excludeId = null) {
        const query = {
            parentId: null,
            $or: [
                { name: new RegExp(`^${name}$`, 'i') },
                { slug: slug.toLowerCase().trim() }
            ]
        };

        if (excludeId) query._id = { $ne: excludeId };
        return Category.findOne(query);
    }

    async findChildByNameOrSlug({ parentId, name, slug, excludeId = null }) {
        const query = {
            parentId,
            $or: [
                { name: new RegExp(`^${name}$`, 'i') },
                { slug: slug.toLowerCase().trim() }
            ]
        };

        if (excludeId) query._id = { $ne: excludeId };
        return Category.findOne(query);
    }

    async findById(id) {
        return Category.findById(id);
    }

    async updateById(category, id) {
        return Category.findByIdAndUpdate(
            id,
            { $set: category },
            { new: true, runValidators: true }
        );
    }

    async create(category) {
        return Category.create(category);
    }

    async all(filter) {
        if (filter.parentId && typeof filter.parentId === 'object' && '$ne' in filter.parentId) {
            const categories = await Category.aggregate([
                { $match: { parentId: null } }, // Only parents
                {
                    $lookup: {
                        from: 'categories',        // Same collection
                        localField: '_id',
                        foreignField: 'parentId',
                        as: 'children',
                    },
                },
                { $match: { 'children.0': { $exists: true } } } // Only parents with children
            ]);

            return categories;
        }

        return Category.find(filter);
    }

    async deleteById(id) {
        return Category.findByIdAndDelete(id);
    }

    async countChildren(parentId) {
        return Category.countDocuments({ parentId });
    }
}

export default new CategoryRepository();
