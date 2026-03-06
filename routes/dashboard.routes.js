import express from 'express';
import dashboardController from '../controllers/dashboard.controller.js';
import { authenticateToken, authorize, requireApprovedSeller } from '../middleware/auth.middleware.js';

const dashboardRouter = express.Router();

dashboardRouter.get('/public/cms', dashboardController.getPublicCms);
dashboardRouter.get('/public/platform-settings', dashboardController.getPublicPlatformSettings);
dashboardRouter.get('/public/sellers/:sellerId/profile', dashboardController.getPublicSellerProfile);

dashboardRouter.use(authenticateToken);

dashboardRouter.get('/notifications', authorize('user', 'seller', 'admin'), dashboardController.getNotifications);
dashboardRouter.patch('/notifications/read-all', authorize('user', 'seller', 'admin'), dashboardController.markAllNotificationsRead);
dashboardRouter.patch('/notifications/:notificationId/read', authorize('user', 'seller', 'admin'), dashboardController.markNotificationRead);

dashboardRouter.get('/user/support-tickets', authorize('user', 'seller', 'admin'), dashboardController.getUserTickets);
dashboardRouter.post('/user/support-tickets', authorize('user', 'seller', 'admin'), dashboardController.createUserTicket);
dashboardRouter.get('/user/return-requests', authorize('user', 'seller', 'admin'), dashboardController.getUserReturnRequests);
dashboardRouter.post('/user/return-requests', authorize('user', 'seller', 'admin'), dashboardController.createReturnRequest);
dashboardRouter.post('/user/return-requests/:requestId/dispute', authorize('user', 'seller', 'admin'), dashboardController.createReturnRequestDispute);
dashboardRouter.get('/user/wishlist', authorize('user', 'seller', 'admin'), dashboardController.getWishlist);
dashboardRouter.post('/user/wishlist', authorize('user', 'seller', 'admin'), dashboardController.addWishlistItem);
dashboardRouter.delete('/user/wishlist', authorize('user', 'seller', 'admin'), dashboardController.clearWishlist);
dashboardRouter.delete('/user/wishlist/:productId', authorize('user', 'seller', 'admin'), dashboardController.removeWishlistItem);
dashboardRouter.get('/user/save-for-later', authorize('user', 'seller', 'admin'), dashboardController.getSavedForLater);
dashboardRouter.post('/user/save-for-later', authorize('user', 'seller', 'admin'), dashboardController.addSavedForLaterItem);
dashboardRouter.delete('/user/save-for-later', authorize('user', 'seller', 'admin'), dashboardController.clearSavedForLater);
dashboardRouter.delete('/user/save-for-later/:productId', authorize('user', 'seller', 'admin'), dashboardController.removeSavedForLaterItem);

dashboardRouter.get('/admin/support-tickets', authorize('admin'), dashboardController.getAdminTickets);
dashboardRouter.patch('/admin/support-tickets/:ticketId', authorize('admin'), dashboardController.updateAdminTicket);
dashboardRouter.get('/admin/disputes', authorize('admin'), dashboardController.getAdminDisputes);
dashboardRouter.patch('/admin/disputes/:disputeId', authorize('admin'), dashboardController.updateAdminDispute);
dashboardRouter.get('/admin/return-requests', authorize('admin'), dashboardController.getAdminReturnRequests);
dashboardRouter.patch('/admin/return-requests/:requestId/intervene', authorize('admin'), dashboardController.interveneInReturnRequest);
dashboardRouter.get('/admin/settings', authorize('admin'), dashboardController.getAdminSettings);
dashboardRouter.get('/admin/coupons', authorize('admin'), dashboardController.getAdminCoupons);
dashboardRouter.put('/admin/coupons', authorize('admin'), dashboardController.updateAdminCoupons);
dashboardRouter.put('/admin/settings/:key', authorize('admin'), dashboardController.updateAdminSettings);
dashboardRouter.get('/admin/analytics', authorize('admin'), dashboardController.getAdminAnalytics);

dashboardRouter.get('/seller/settings', authorize('seller'), requireApprovedSeller, dashboardController.getSellerSettings);
dashboardRouter.put('/seller/settings/profile', authorize('seller'), requireApprovedSeller, dashboardController.updateSellerProfile);
dashboardRouter.put('/seller/settings/payout', authorize('seller'), requireApprovedSeller, dashboardController.updateSellerPayout);
dashboardRouter.get('/seller/payout/summary', authorize('seller'), requireApprovedSeller, dashboardController.getSellerPayoutSummary);
dashboardRouter.post('/seller/payout/withdraw', authorize('seller'), requireApprovedSeller, dashboardController.withdrawSellerPayout);
dashboardRouter.get('/seller/analytics', authorize('seller'), requireApprovedSeller, dashboardController.getSellerAnalytics);
dashboardRouter.get('/seller/products', authorize('seller'), requireApprovedSeller, dashboardController.getSellerProducts);
dashboardRouter.get('/seller/return-requests', authorize('seller'), requireApprovedSeller, dashboardController.getSellerReturnRequests);
dashboardRouter.patch('/seller/return-requests/:requestId/decision', authorize('seller'), requireApprovedSeller, dashboardController.decideSellerReturnRequest);

export default dashboardRouter;
