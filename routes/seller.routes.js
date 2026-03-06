import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import sellerController from "../controllers/seller.controller.js";
import { combineUploads } from "../utils/upload.until.js";

const sellerRouter = express.Router();

sellerRouter.get(
    '/store/:sellerSlug',
    sellerController.getPublicStoreBySlug
);

sellerRouter.get(
    '/all', 
    authenticateToken,
    sellerController.getSellers,
)

sellerRouter.post(
    '/apply', 
    authenticateToken, 
    combineUploads.fields([
        { name: "logo", maxCount: 1 },
        { name: "licenseDoc", maxCount: 1 },
    ]),
    sellerController.apply
);

export default sellerRouter;
