import cloudinary from "../config/cloudinary.js";
import { CreateCategoryDto } from "../dtos/category.dto.js";
import categoryRepository from "../repositories/category.repository.js";
import { AppError } from "../utils/errors.util.js";

class categoryService {
    async create(payload) {
        const categoryData = new CreateCategoryDto(payload);
        const { name, slug, parentId } = categoryData;

        if (! parentId) {
            const category = await categoryRepository.findParentByNameOrSlug(name, slug);           
            if (category) {
                throw new AppError('A parent category with this name or slug already exists', 409);
            }
        } else {
            const parent = await categoryRepository.findById(parentId);
            if (!parent) {
                throw new AppError('Selected parent category was not found', 404);
            }
            if (parent.parentId) {
                throw new AppError('Parent category must be a top-level category', 400);
            }

            const category = await categoryRepository.findChildByNameOrSlug({ name, slug, parentId });
            if (category) {
                throw new AppError('A child category with this name or slug already exists under this parent', 409);
            }         
        }

        const newCategory = await categoryRepository.create(categoryData);

        return newCategory;
    }

    async update(payload, id) {
        const categoryData = new CreateCategoryDto(payload);
        const { name, slug, parentId } = categoryData;

        const category = await categoryRepository.findById(id);
        if (!category) {
            throw new AppError('Category Not Found', 404);
        }

        if (parentId && String(parentId) === String(id)) {
            throw new AppError('A category cannot be its own parent', 400);
        }

        if (parentId) {
            const parent = await categoryRepository.findById(parentId);
            if (!parent) {
                throw new AppError('Selected parent category was not found', 404);
            }
            if (parent.parentId) {
                throw new AppError('Parent category must be a top-level category', 400);
            }
        }

        const hasChildren = (await categoryRepository.countChildren(id)) > 0;
        if (hasChildren && parentId) {
            throw new AppError('A category with subcategories cannot be assigned under another parent', 409);
        }

        if (!parentId) {
            const duplicate = await categoryRepository.findParentByNameOrSlug(name, slug, id);
            if (duplicate) {
                throw new AppError('A parent category with this name or slug already exists', 409);
            }
        } else {
            const duplicate = await categoryRepository.findChildByNameOrSlug({ name, slug, parentId, excludeId: id });
            if (duplicate) {
                throw new AppError('A child category with this name or slug already exists under this parent', 409);
            }
        }

        if (payload.logo && category.logo?.publicId) {
            await cloudinary.uploader.destroy(category.logo.publicId);
        }

        const updatedCategory = await categoryRepository.updateById(categoryData, id);
        return updatedCategory;
    };

    async getCategories({ type, parentId }) {
        let filter = {};

        if (type === 'parent') filter = { parentId: null };
        if (type === 'child') filter = { parentId: { $ne: null } };
        if (parentId) filter = { parentId };

        return categoryRepository.all(filter);
    }

    async getCategoryById(id) {
        const category = await categoryRepository.findById(id);
        if (!category) {
            throw new AppError('Category Not Found', 404);
        }

        return category;
    }

    async delete(id) {
        const children = await categoryRepository.countChildren(id);
        if (children > 0) {
            throw new AppError('Cannot delete a parent category that still has child categories', 409);
        }

        const brand = await categoryRepository.deleteById(id);
        
        if (!brand) {
            throw new AppError('Category Not Found', 404);
        }

        return brand;
    }
}

export default new categoryService();
