import productService from "../services/product.service.js";
import { asyncHandler } from "../utils/async-handler.util.js";
import ApiResponse from '../utils/response.util.js'

class ProductController{
    create = asyncHandler(async (req, res) => {
        const user = req.user;
        const values = req.body;         
        const mainImage = req.files?.mainImage?.[0];
        const additionalImages = req.files?.additionalImages || [];

        const product = await productService.create({ values, mainImage, additionalImages, user });

        if (!product) {
            return ApiResponse.error(res, 'Product Not Created', 500);
        }

        return ApiResponse.success(res, product, 'Product Created Successfully', 200);
    });

    update = asyncHandler(async (req, res) => {
        const user = req.user;
        const id = req.params.id;
        const values = req.body;         
        const mainImage = req.files?.mainImage?.[0];
        const additionalImages = req.files?.additionalImages || [];

        const product = await productService.update({ values, mainImage, additionalImages, user }, id);

        if (!product) {
            return ApiResponse.error(res, 'Product Not Updated', 500);
        }

        return ApiResponse.success(res, product, 'Product Updated Successfully', 200);
    });

    getProducts = asyncHandler(async (req, res) => {
        const data = await productService.getAll(req.query);

        return ApiResponse.success(res, data, 'Products Found Successfully', 200);
    })

    getProductById = asyncHandler(async (req, res) => {
        const id = req.params.id;
        const product = await productService.getProductById(id);

        if (!product) {
            return ApiResponse.error(res, 'Product Not Found', 404);
        }

        return ApiResponse.success(res, product, 'Product Found Successfully', 200);
    })

    getBySellerId = asyncHandler(async (req, res) => {
        const sellerId = req.user.sellerId;
   
        const products = await productService.getBySellerId(sellerId);

        if (!products) {
            return ApiResponse.error(res, 'Products Not Found', 404);
        }

        return ApiResponse.success(res, products, 'Products Found Successfully', 200);
    })

    getFlashSaleProducts = asyncHandler(async (_req, res) => {
        const products = await productService.getFlashSaleProducts();
        return ApiResponse.success(res, products, 'Flash sale products found successfully', 200);
    });

    delete = asyncHandler(async (req, res) => {
        const id = req.params.id;
        const result = await productService.delete(id);

        if (!result) {
            return ApiResponse.error(res, 'Product Not Deleted', 404);
        }

        return ApiResponse.success(res, result, 'Product Deleted Successfully', 200);
    })

    sellerUpdate = asyncHandler(async (req, res) => {
        const sellerId = req.user?.sellerId;
        const productId = req.params.id;
        const values = req.body;
        const files = req.files;

        const product = await productService.sellerUpdate(sellerId, productId, values, files);

        return ApiResponse.success(res, product, 'Product Updated Successfully', 200);
    });

    sellerDelete = asyncHandler(async (req, res) => {
        const sellerId = req.user?.sellerId;
        const productId = req.params.id;
        const result = await productService.sellerDelete(sellerId, productId);

        return ApiResponse.success(res, result, 'Product Deleted Successfully', 200);
    });

    setFlashSale = asyncHandler(async (req, res) => {
        const productId = req.params.id;
        const result = await productService.setFlashSale(productId, req.body);
        return ApiResponse.success(res, result, 'Flash sale updated successfully', 200);
    });

    getFilterOptions = asyncHandler(async (req, res) => {
        const options = await productService.getFilterOptions();
        return ApiResponse.success(res, options, 'Filter options retrieved successfully', 200);
    });
}

export default new ProductController();
