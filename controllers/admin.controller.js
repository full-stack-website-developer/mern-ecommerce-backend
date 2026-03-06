// import adminService from "../services/admin.service.js";
// import { asyncHandler } from "../utils/async-handler.util.js";
// import ApiResponse from '../utils/response.util.js';

// class AdminController {
//     updateSellerStatus = asyncHandler(async (req, res) => {
//         const id = req.params.id;
//         const status = req.body.status;

//         const seller = await adminService.updateSellerStatus(id, status);
//         if (!seller) {
//             return ApiResponse.error(res, seller, 'Seller Not Updated', 500);
//         }

//         return ApiResponse.success(res, seller, 'Seller Updated Successfuly', 200);
//     })
// }

// export default new AdminController();

import adminService from '../services/admin.service.js';
import { asyncHandler } from '../utils/async-handler.util.js';
import ApiResponse from '../utils/response.util.js';

class AdminController {

    // ── PATCH /api/admin/seller/:id/status ────────────────────────────────────
    updateSellerStatus = asyncHandler(async (req, res) => {
        const { id }     = req.params;
        const { status } = req.body;

        const seller = await adminService.updateSellerStatus(id, status);
        return ApiResponse.success(res, seller, 'Seller updated successfully', 200);
    });

    // ── GET /api/admin/users ──────────────────────────────────────────────────
    listUsers = asyncHandler(async (req, res) => {
        const { page = 1, limit = 10, role, status, search } = req.query;

        const result = await adminService.listUsers({
            page:  Number(page),
            limit: Number(limit),
            role:  role   || undefined,
            status: status || undefined,
            search: search || undefined,
        });

        return ApiResponse.success(res, result, 'Users fetched successfully', 200);
    });
}

export default new AdminController();