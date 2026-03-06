import cartService from "../services/cart.service.js";
import { asyncHandler } from "../utils/async-handler.util.js";
import ApiResponse from "../utils/response.util.js";

class CartController {
    create = asyncHandler(async (req, res) => {
        const values = req.body;

        const cart = await cartService.addItem(values);

        if (!cart) {
            return ApiResponse.error(res, 'Cart Not Updated', 500);
        }

        return ApiResponse.success(res, cart, 'Cart Updated Successfully', 200);
    })

    bulkAddItems = asyncHandler(async (req, res) => {
        const values = req.body;

        const cart = await cartService.bulkAddItems(values);

        if (!cart) {
            return ApiResponse.error(res, 'Cart Not Updated', 500);
        }

        return ApiResponse.success(res, cart, 'Cart Updated Successfully', 200);
    })

    getCart = asyncHandler(async (req, res) => {
        const cart = await cartService.getCart();
        if (!cart) {
            return ApiResponse.error(res, 'Cart Not Found', 404);
        }

        return ApiResponse.success(res, cart, 'Cart Found Successfully', 200);
    });

    getByUserId = asyncHandler(async (req, res) => {
        const userId = req.params.id;

        const cart = await cartService.getByUserId(userId);

        return ApiResponse.success(res, cart, 'Cart Found Successfully', 200);
    });

    updateItemQuantity = asyncHandler(async (req, res) => {
        const { itemId } = req.params;
        const { userId, quantity } = req.body;

        const cart = await cartService.updateItemQuantity(itemId, userId, quantity);

        if (!cart) {
            return ApiResponse.error(res, 'Cart Not Updated', 500);
        }
        
        return ApiResponse.success(res, cart, 'Cart Updated Successfully', 200);
    });

    preview = asyncHandler(async (req, res) => {
        const items = req.body; // guest cart from localStorage

        if (!Array.isArray(items) || items.length === 0) {
            return ApiResponse.error(res, 'Cart items are required', 400);
        }

        const previewCart = await cartService.preview(items);

        if (!previewCart) {
            return ApiResponse.error(res, 'Unable to preview cart', 500);
        }

        return ApiResponse.success(res, previewCart, 'Cart Preview Generated', 200);
    });

    delete = asyncHandler(async (req, res) => {
        const id = req.params.id;
        const userId = req.user.id;
        const result = await cartService.delete(id, userId);

        if (!result) {
            return ApiResponse.error(res, 'Item Not Deleted', 404);
        }

        return ApiResponse.success(res, result, 'Item Deleted Successfully', 200);
    })

    clearCart = asyncHandler(async (req, res) => {
        const userId = req.params.id;
        const result = await cartService.clearCart(userId);

        if (!result) {
            return ApiResponse.error(res, 'Cart Not Deleted', 404);
        }

        return ApiResponse.success(res, result, 'Cart Deleted Successfully', 200);
    })
}

export default new CartController();