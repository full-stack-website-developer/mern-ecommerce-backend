import dashboardService from '../services/dashboard.service.js';
import { asyncHandler } from '../utils/async-handler.util.js';
import ApiResponse from '../utils/response.util.js';

class DashboardController {
    getPublicCms = asyncHandler(async (_req, res) => {
        const result = await dashboardService.getPublicCms();
        return ApiResponse.success(res, result, 'CMS fetched');
    });

    getPublicPlatformSettings = asyncHandler(async (_req, res) => {
        const result = await dashboardService.getPublicPlatformSettings();
        return ApiResponse.success(res, result, 'Platform settings fetched');
    });

    getPublicSellerProfile = asyncHandler(async (req, res) => {
        const profile = await dashboardService.getPublicSellerProfile(req.params.sellerId);
        return ApiResponse.success(res, { profile }, 'Seller profile fetched');
    });

    getPublicSellerProfile = asyncHandler(async (req, res) => {
        const profile = await dashboardService.getPublicSellerProfile(req.params.sellerId);
        return ApiResponse.success(res, { profile }, 'Seller profile fetched');
    });

    createUserTicket = asyncHandler(async (req, res) => {
        const ticket = await dashboardService.createUserTicket(req.user.id, req.body);
        return ApiResponse.success(res, { ticket }, 'Support ticket created', 201);
    });

    getUserTickets = asyncHandler(async (req, res) => {
        const tickets = await dashboardService.getUserTickets(req.user.id);
        return ApiResponse.success(res, { tickets }, 'Support tickets fetched');
    });

    createReturnRequest = asyncHandler(async (req, res) => {
        const request = await dashboardService.createReturnRequest(req.user.id, req.body);
        return ApiResponse.success(res, { request }, 'Return request created', 201);
    });

    getUserReturnRequests = asyncHandler(async (req, res) => {
        const requests = await dashboardService.getUserReturnRequests(req.user.id);
        return ApiResponse.success(res, { requests }, 'Return requests fetched');
    });

    createReturnRequestDispute = asyncHandler(async (req, res) => {
        const dispute = await dashboardService.createReturnRequestDispute(req.user.id, req.params.requestId, req.body);
        return ApiResponse.success(res, { dispute }, 'Return request disputed', 201);
    });

    addWishlistItem = asyncHandler(async (req, res) => {
        const item = await dashboardService.addWishlistItem(req.user.id, req.body.productId, req.body.saveForLater);
        return ApiResponse.success(res, { item }, 'Item saved');
    });

    removeWishlistItem = asyncHandler(async (req, res) => {
        const result = await dashboardService.removeWishlistItem(req.user.id, req.params.productId);
        return ApiResponse.success(res, result, 'Item removed');
    });

    clearWishlist = asyncHandler(async (req, res) => {
        const result = await dashboardService.clearWishlist(req.user.id);
        return ApiResponse.success(res, result, 'Wishlist cleared');
    });

    getWishlist = asyncHandler(async (req, res) => {
        const result = await dashboardService.getWishlist(req.user.id);
        return ApiResponse.success(res, result, 'Wishlist fetched');
    });

    getSavedForLater = asyncHandler(async (req, res) => {
        const result = await dashboardService.getSavedForLater(req.user.id);
        return ApiResponse.success(res, result, 'Saved items fetched');
    });

    addSavedForLaterItem = asyncHandler(async (req, res) => {
        const result = await dashboardService.addSavedForLaterItem(req.user.id, req.body.productId);
        return ApiResponse.success(res, result, 'Item saved for later');
    });

    removeSavedForLaterItem = asyncHandler(async (req, res) => {
        const result = await dashboardService.removeSavedForLaterItem(req.user.id, req.params.productId);
        return ApiResponse.success(res, result, 'Item removed');
    });

    clearSavedForLater = asyncHandler(async (req, res) => {
        const result = await dashboardService.clearSavedForLater(req.user.id);
        return ApiResponse.success(res, result, 'Saved for later cleared');
    });

    getNotifications = asyncHandler(async (req, res) => {
        const result = await dashboardService.getNotifications(req.user.id);
        return ApiResponse.success(res, result, 'Notifications fetched');
    });

    markNotificationRead = asyncHandler(async (req, res) => {
        const notification = await dashboardService.markNotificationRead(req.user.id, req.params.notificationId);
        return ApiResponse.success(res, { notification }, 'Notification updated');
    });

    markAllNotificationsRead = asyncHandler(async (req, res) => {
        const result = await dashboardService.markAllNotificationsRead(req.user.id);
        return ApiResponse.success(res, result, 'All notifications marked as read');
    });

    getAdminTickets = asyncHandler(async (req, res) => {
        const tickets = await dashboardService.getAdminTickets(req.query);
        return ApiResponse.success(res, { tickets }, 'Tickets fetched');
    });

    updateAdminTicket = asyncHandler(async (req, res) => {
        const ticket = await dashboardService.updateAdminTicket(req.params.ticketId, req.body);
        return ApiResponse.success(res, { ticket }, 'Ticket updated');
    });

    getAdminDisputes = asyncHandler(async (req, res) => {
        const disputes = await dashboardService.getAdminDisputes(req.query);
        return ApiResponse.success(res, { disputes }, 'Disputes fetched');
    });

    updateAdminDispute = asyncHandler(async (req, res) => {
        const dispute = await dashboardService.updateAdminDispute(req.params.disputeId, req.body);
        return ApiResponse.success(res, { dispute }, 'Dispute updated');
    });

    getAdminReturnRequests = asyncHandler(async (req, res) => {
        const requests = await dashboardService.getAdminReturnRequests(req.query);
        return ApiResponse.success(res, { requests }, 'Return requests fetched');
    });

    interveneInReturnRequest = asyncHandler(async (req, res) => {
        const request = await dashboardService.interveneInReturnRequest(req.params.requestId, req.body);
        return ApiResponse.success(res, { request }, 'Return request resolved by admin');
    });

    getAdminSettings = asyncHandler(async (_req, res) => {
        const settings = await dashboardService.getAdminSettings();
        return ApiResponse.success(res, { settings }, 'Settings fetched');
    });

    getAdminCoupons = asyncHandler(async (_req, res) => {
        const coupons = await dashboardService.getAdminCoupons();
        return ApiResponse.success(res, coupons, 'Coupons fetched');
    });

    updateAdminCoupons = asyncHandler(async (req, res) => {
        const coupons = await dashboardService.updateAdminCoupons(req.body?.coupons || []);
        return ApiResponse.success(res, coupons, 'Coupons saved');
    });

    updateAdminSettings = asyncHandler(async (req, res) => {
        const value = await dashboardService.updateAdminSettings(req.params.key, req.body);
        return ApiResponse.success(res, { value }, 'Settings saved');
    });

    getAdminAnalytics = asyncHandler(async (req, res) => {
        const days = Number(req.query.days || 30);
        const analytics = await dashboardService.getAdminAnalytics(days);
        return ApiResponse.success(res, { analytics }, 'Analytics fetched');
    });

    getSellerSettings = asyncHandler(async (req, res) => {
        const settings = await dashboardService.getSellerSettings(req.user.sellerId);
        return ApiResponse.success(res, { settings }, 'Seller settings fetched');
    });

    updateSellerProfile = asyncHandler(async (req, res) => {
        const doc = await dashboardService.updateSellerProfile(req.user.sellerId, req.body);
        return ApiResponse.success(res, { profile: doc.value }, 'Seller profile saved');
    });

    updateSellerPayout = asyncHandler(async (req, res) => {
        const doc = await dashboardService.updateSellerPayout(req.user.sellerId, req.body);
        return ApiResponse.success(res, { payout: doc.value }, 'Payout settings saved');
    });

    getSellerPayoutSummary = asyncHandler(async (req, res) => {
        const summary = await dashboardService.getSellerPayoutSummary(req.user.sellerId);
        return ApiResponse.success(res, { summary }, 'Payout summary fetched');
    });

    withdrawSellerPayout = asyncHandler(async (req, res) => {
        const payout = await dashboardService.withdrawSellerPayout(req.user.sellerId, req.body);
        return ApiResponse.success(res, { payout }, 'Withdrawal requested successfully');
    });

    getSellerAnalytics = asyncHandler(async (req, res) => {
        const days = Number(req.query.days || 30);
        const analytics = await dashboardService.getSellerAnalytics(req.user.sellerId, days);
        return ApiResponse.success(res, { analytics }, 'Seller analytics fetched');
    });

    getSellerProducts = asyncHandler(async (req, res) => {
        const products = await dashboardService.getSellerProducts(req.user.sellerId);
        return ApiResponse.success(res, { products }, 'Seller products fetched');
    });

    getSellerReturnRequests = asyncHandler(async (req, res) => {
        const requests = await dashboardService.getSellerReturnRequests(req.user.sellerId, req.query);
        return ApiResponse.success(res, { requests }, 'Return requests fetched');
    });

    decideSellerReturnRequest = asyncHandler(async (req, res) => {
        const request = await dashboardService.decideSellerReturnRequest(req.user.sellerId, req.params.requestId, req.body);
        return ApiResponse.success(res, { request }, 'Return request updated');
    });
}

export default new DashboardController();
