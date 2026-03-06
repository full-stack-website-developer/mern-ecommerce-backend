import express from "express";
import { authenticateToken, authorize, requireApprovedSeller } from "../middleware/auth.middleware.js";
import productController from "../controllers/product.controller.js";
import { uploadProductImages } from "../uploads/image.upload.js";

const productRouter = express.Router();

productRouter.post(
    '/', 
    authenticateToken,
    requireApprovedSeller,
    authorize('admin', 'seller'), 
    uploadProductImages.fields([
        { name: 'mainImage', maxCount: 1 },
        { name: 'additionalImages', maxCount: 5 }
    ]),
    productController.create
);

productRouter.get(
    '/',
    // authenticateToken,
    // authorize('admin'), 
    productController.getProducts
);

productRouter.get(
    '/filter-options',
    productController.getFilterOptions
);

productRouter.get(
    '/me',
    authenticateToken,
    requireApprovedSeller,
    authorize('seller', 'admin'), 
    productController.getBySellerId
);

productRouter.get(
    '/flash-sale',
    productController.getFlashSaleProducts
);

productRouter.get(
    '/:id',
    // authenticateToken,
    // authorize('admin'), 
    productController.getProductById
);

productRouter.put(
    '/:id', 
    authenticateToken,
    authorize('admin'), 
    uploadProductImages.fields([
        { name: 'mainImage', maxCount: 1 },
        { name: 'additionalImages' }
    ]),
    productController.update
);

productRouter.patch(
    '/:id/seller',
    authenticateToken,
    authorize('seller'),
    requireApprovedSeller,
    uploadProductImages.fields([
        { name: 'mainImage', maxCount: 1 },
        { name: 'additionalImages', maxCount: 5 }
    ]),
    productController.sellerUpdate
);

productRouter.patch(
    '/:id/flash-sale',
    authenticateToken,
    authorize('admin'),
    productController.setFlashSale
);

productRouter.delete(
    '/:id',
    authenticateToken,
    authorize('admin'), 
    productController.delete
);

productRouter.delete(
    '/:id/seller',
    authenticateToken,
    authorize('seller'),
    requireApprovedSeller,
    productController.sellerDelete
);


export default productRouter;
