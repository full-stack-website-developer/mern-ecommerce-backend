import { authenticateToken, authorize } from '../middleware/auth.middleware.js';
import express from 'express';
import { uploadSingleImage } from '../uploads/image.upload.js';
import brandController from '../controllers/brand.controller.js';

const brandRouter = express.Router();

brandRouter.post(
    '/', 
    authenticateToken, 
    authorize('admin'),
    uploadSingleImage.single('logo'),
    brandController.create
);

brandRouter.put(
    '/:id', 
    authenticateToken,
    authorize('admin'),
    uploadSingleImage.single('logo'),
    brandController.update
);

brandRouter.get(
    '/', 
    authenticateToken, 
    // authorize('admin'),
    brandController.getBrands
);

brandRouter.get(
    '/:id', 
    authenticateToken,
    authorize('admin'),
    brandController.getBrandById
);

brandRouter.put(
    '/:id', 
    authenticateToken,
    authorize('admin'), 
    uploadSingleImage.single('logo'),
    brandController.update
);

brandRouter.delete(
    '/:id',
    authenticateToken,
    authorize('admin'), 
    brandController.delete
);

export default brandRouter;