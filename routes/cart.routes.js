import express from "express";
import cartController from "../controllers/cart.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const cartRouter = express.Router();

cartRouter.post('/items', cartController.create);
// cartRouter.get('/items', cartController.getCart);
cartRouter.get('/items/:id', cartController.getByUserId);
cartRouter.post('/items/merge', cartController.bulkAddItems);
cartRouter.delete('/items/:id', authenticateToken, cartController.delete);
cartRouter.patch('/items/:itemId', cartController.updateItemQuantity);
cartRouter.post('/items/preview', cartController.preview);
cartRouter.delete('/items/clear/:id', cartController.clearCart);

export default cartRouter;