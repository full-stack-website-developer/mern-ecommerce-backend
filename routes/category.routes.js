import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.middleware.js';
import categoryController from '../controllers/category.controller.js';
import { uploadSingleImage } from '../uploads/image.upload.js';

const categoryRouter = express.Router();

categoryRouter.post(
    '/', 
    authenticateToken,
    authorize('admin'),
    uploadSingleImage.single('logo'),
    categoryController.create
);

categoryRouter.put(
    '/:id', 
    authenticateToken,
    authorize('admin'),
    uploadSingleImage.single('logo'),
    categoryController.update
);

categoryRouter.get(
    '/', 
    categoryController.getCategories
);

categoryRouter.get(
    '/:id', 
    authenticateToken,
    authorize('admin'),
    categoryController.getCategoryById
);

categoryRouter.delete(
    '/:id',
    authenticateToken,
    authorize('admin'), 
    categoryController.delete
);

export default categoryRouter;
