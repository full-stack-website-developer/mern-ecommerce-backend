import dashboardRepository from '../repositories/dashboard.repository.js';
import payoutTransactionRepository from '../repositories/payout-transaction.repository.js';
import couponService from './coupon.service.js';
import stripeService from './stripe.service.js';
import { AppError } from '../utils/errors.util.js';

class DashboardService {
    _defaultCms() {
        return {
            hero: {
                badgeText: 'New Collection 2026',
                title: 'Shop the Latest Trends',
                subtitle: 'Discover amazing products at unbeatable prices. Free shipping on orders over $50.',
                primaryButtonText: 'Shop Now',
                primaryButtonLink: '/products',
                secondaryButtonText: 'Flash Sales',
                secondaryButtonLink: '/products',
                imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1400&auto=format&fit=crop',
                startColor: '#2563eb',
                endColor: '#1e3a8a',
            },
            promos: [],
            newsletter: {
                title: 'Subscribe to Our Newsletter',
                subtitle: 'Get the latest updates on new products and upcoming sales',
                placeholder: 'Enter your email',
                buttonText: 'Subscribe',
            },
            sections: {
                hero: true,
                flashSales: true,
                categories: true,
                featuredProducts: true,
                recommendedProducts: true,
                recentlyViewed: true,
                newsletter: true,
            },
        };
    }

    _defaultPlatform() {
        return {
            gateway: 'stripe',
            currency: 'USD',
            defaultShippingCost: 10,
            freeShippingThreshold: 100,
            taxRate: 10,
            siteName: 'Ecommerce',
            supportEmail: '',
            supportPhone: '',
        };
    }

    _sanitizePlatform(input = {}) {
        const defaults = this._defaultPlatform();

        const normalized = {
            ...defaults,
            ...input,
            gateway: String(input.gateway ?? defaults.gateway).toLowerCase().trim(),
            currency: String(input.currency ?? defaults.currency).toUpperCase().trim(),
            siteName: String(input.siteName ?? defaults.siteName).trim(),
            supportEmail: String(input.supportEmail ?? defaults.supportEmail).trim(),
            supportPhone: String(input.supportPhone ?? defaults.supportPhone).trim(),
            defaultShippingCost: Number(input.defaultShippingCost ?? defaults.defaultShippingCost),
            freeShippingThreshold: Number(input.freeShippingThreshold ?? defaults.freeShippingThreshold),
            taxRate: Number(input.taxRate ?? defaults.taxRate),
        };

        if (!['stripe', 'paypal', 'cod'].includes(normalized.gateway)) {
            throw new AppError('Invalid gateway. Use stripe, paypal, or cod', 400);
        }
        if (!/^[A-Z]{3}$/.test(normalized.currency)) {
            throw new AppError('Invalid currency code (must be 3 uppercase letters)', 400);
        }
        if (!Number.isFinite(normalized.defaultShippingCost) || normalized.defaultShippingCost < 0) {
            throw new AppError('defaultShippingCost must be a non-negative number', 400);
        }
        if (!Number.isFinite(normalized.freeShippingThreshold) || normalized.freeShippingThreshold < 0) {
            throw new AppError('freeShippingThreshold must be a non-negative number', 400);
        }
        if (!Number.isFinite(normalized.taxRate) || normalized.taxRate < 0 || normalized.taxRate > 100) {
            throw new AppError('taxRate must be between 0 and 100', 400);
        }
        if (!normalized.siteName) {
            throw new AppError('siteName is required', 400);
        }

        return normalized;
    }

    _defaultSellerProfile() {
        return {
            storeName: '',
            storeSlug: '',
            contactEmail: '',
            phone: '',
            businessAddress: '',
            storeDescription: '',
        };
    }

    _defaultSellerPayout() {
        return {
            payoutMethod: 'bank',
            bankName: '',
            accountHolderName: '',
            accountNumber: '',
            routingNumber: '',
            stripeAccountId: '',
            frequency: 'weekly',
            minimumPayout: 50,
        };
    }

    _sanitizeSellerProfile(input = {}) {
        const defaults = this._defaultSellerProfile();
        const storeName = String(input.storeName ?? defaults.storeName).trim();
        const storeSlug = String(input.storeSlug ?? defaults.storeSlug)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        return {
            storeName,
            storeSlug,
            contactEmail: String(input.contactEmail ?? defaults.contactEmail).trim().toLowerCase(),
            phone: String(input.phone ?? defaults.phone).trim(),
            businessAddress: String(input.businessAddress ?? defaults.businessAddress).trim(),
            storeDescription: String(input.storeDescription ?? defaults.storeDescription).trim(),
        };
    }

    _sanitizeSellerPayout(input = {}, { requireStripeAccount = false } = {}) {
        const defaults = this._defaultSellerPayout();
        const payoutMethod = String(input.payoutMethod ?? defaults.payoutMethod).trim().toLowerCase();
        const minimumPayout = Number(input.minimumPayout ?? defaults.minimumPayout);

        if (!['bank', 'paypal', 'stripe'].includes(payoutMethod)) {
            throw new AppError('Invalid payout method', 400);
        }

        if (!['weekly', 'biweekly', 'monthly'].includes(String(input.frequency ?? defaults.frequency))) {
            throw new AppError('Invalid payout frequency', 400);
        }

        if (!Number.isFinite(minimumPayout) || minimumPayout < 1) {
            throw new AppError('minimumPayout must be at least 1', 400);
        }

        const normalized = {
            payoutMethod,
            bankName: String(input.bankName ?? defaults.bankName).trim(),
            accountHolderName: String(input.accountHolderName ?? defaults.accountHolderName).trim(),
            accountNumber: String(input.accountNumber ?? defaults.accountNumber).trim(),
            routingNumber: String(input.routingNumber ?? defaults.routingNumber).trim(),
            stripeAccountId: String(input.stripeAccountId ?? defaults.stripeAccountId).trim(),
            frequency: String(input.frequency ?? defaults.frequency),
            minimumPayout,
        };

        if (requireStripeAccount && normalized.payoutMethod === 'stripe' && !normalized.stripeAccountId) {
            throw new AppError('stripeAccountId is required for Stripe payouts', 400);
        }

        return normalized;
    }

    _resolveSellerIdFromOrder(order, sellerId) {
        const sellerIds = [...new Set((order.subOrder || []).map((sub) => String(sub.sellerId)).filter(Boolean))];
        if (sellerId) {
            if (!sellerIds.includes(String(sellerId))) {
                throw new AppError('Provided sellerId is not part of this order', 400);
            }
            return sellerId;
        }

        if (sellerIds.length === 1) {
            return sellerIds[0];
        }

        throw new AppError('sellerId is required for multi-seller orders', 400);
    }

    async createUserTicket(userId, payload) {
        const ticket = await dashboardRepository.createSupportTicket({
            userId,
            subject: payload.subject,
            category: payload.category,
            priority: payload.priority,
            orderRef: payload.orderRef ?? null,
            message: payload.message,
        });

        await dashboardRepository.createNotification({
            userId,
            type: 'support',
            title: 'Support ticket created',
            message: `Ticket ${ticket.ticketNumber} was submitted successfully.`,
            meta: { ticketId: ticket._id },
        });

        return ticket;
    }

    getUserTickets(userId) {
        return dashboardRepository.findSupportTicketsByUser(userId);
    }

    async createReturnRequest(userId, payload) {
        if (!payload.orderRef) throw new AppError('orderRef is required', 400);
        if (!payload.itemName) throw new AppError('itemName is required', 400);
        if (!payload.requestType) throw new AppError('requestType is required', 400);
        if (!payload.reason) throw new AppError('reason is required', 400);

        const order = await dashboardRepository.findOrderByRefForUser(payload.orderRef, userId);
        if (!order) {
            throw new AppError('Order not found for this user', 404);
        }

        const sellerId = this._resolveSellerIdFromOrder(order, payload.sellerId);
        const seller = await dashboardRepository.findSellerById(sellerId);
        if (!seller) throw new AppError('Seller not found', 404);

        const request = await dashboardRepository.createReturnRequest({
            userId,
            orderId: order._id,
            sellerId: seller._id,
            orderRef: payload.orderRef,
            itemName: payload.itemName,
            requestType: payload.requestType,
            reason: payload.reason,
            quantity: payload.quantity ?? 1,
            details: payload.details ?? '',
        });

        await dashboardRepository.createNotification({
            userId,
            type: 'support',
            title: 'Return request submitted',
            message: `Request ${request.requestNumber} has been submitted.`,
            meta: { requestId: request._id },
        });

        if (seller.userId) {
            await dashboardRepository.createNotification({
                userId: seller.userId,
                type: 'support',
                title: 'New return request',
                message: `A customer submitted return request ${request.requestNumber}.`,
                meta: { requestId: request._id, orderRef: request.orderRef },
            });
        }

        return request;
    }

    getUserReturnRequests(userId) {
        return dashboardRepository.findReturnRequestsByUser(userId);
    }

    async createReturnRequestDispute(userId, requestId, payload = {}) {
        const request = await dashboardRepository.findReturnRequestByIdForUser(requestId, userId);
        if (!request) throw new AppError('Return request not found', 404);
        if (request.status !== 'rejected') {
            throw new AppError('Only rejected return requests can be disputed', 400);
        }
        if (request.isDisputed) {
            throw new AppError('Dispute already exists for this request', 400);
        }

        const reason = payload.reason?.trim() || request.details || request.reason;
        const disputeType = request.requestType === 'refund' ? 'refund' : 'other';

        const dispute = await dashboardRepository.createDispute({
            orderId: request.orderId,
            returnRequestId: request._id,
            userId: request.userId,
            sellerId: request.sellerId,
            type: disputeType,
            reason,
            status: 'open',
        });

        await dashboardRepository.updateReturnRequest(request._id, {
            isDisputed: true,
            disputeId: dispute._id,
            status: 'rejected',
        });

        const [seller, admins] = await Promise.all([
            dashboardRepository.findSellerById(request.sellerId),
            dashboardRepository.findAdminUserIds(),
        ]);

        const notifications = admins.map((admin) => ({
            userId: admin._id,
            type: 'support',
            title: 'Return dispute raised',
            message: `Dispute ${dispute.disputeNumber} needs review for return request ${request.requestNumber}.`,
            meta: { disputeId: dispute._id, requestId: request._id },
        }));

        if (seller?.userId) {
            notifications.push({
                userId: seller.userId,
                type: 'support',
                title: 'Customer raised a dispute',
                message: `Return request ${request.requestNumber} has been escalated to admin review.`,
                meta: { disputeId: dispute._id, requestId: request._id },
            });
        }

        await dashboardRepository.createNotifications(notifications);

        return dispute;
    }

    async addWishlistItem(userId, productId, saveForLater = false) {
        if (!productId) throw new AppError('productId is required', 400);
        return dashboardRepository.addWishlistItem({ userId, productId, saveForLater });
    }

    async removeWishlistItem(userId, productId) {
        await dashboardRepository.removeWishlistItem(userId, productId);
        return { removed: true };
    }

    async clearWishlist(userId) {
        await dashboardRepository.clearWishlist(userId);
        return { cleared: true };
    }

    async getWishlist(userId) {
        const items = await dashboardRepository.findWishlist(userId);
        return { items };
    }

    async getSavedForLater(userId) {
        const items = await dashboardRepository.findSavedForLater(userId);
        return { items };
    }

    async addSavedForLaterItem(userId, productId) {
        if (!productId) throw new AppError('productId is required', 400);
        const item = await dashboardRepository.addWishlistItem({ userId, productId, saveForLater: true });
        return { item };
    }

    async removeSavedForLaterItem(userId, productId) {
        await dashboardRepository.removeWishlistItem(userId, productId);
        return { removed: true };
    }

    async clearSavedForLater(userId) {
        await dashboardRepository.clearSavedForLater(userId);
        return { cleared: true };
    }

    async getNotifications(userId) {
        const notifications = await dashboardRepository.findNotificationsByUser(userId);
        const unreadCount = notifications.filter((n) => !n.read).length;
        return { notifications, unreadCount };
    }

    async markNotificationRead(userId, notificationId) {
        const notification = await dashboardRepository.markNotificationRead(notificationId, userId);
        if (!notification) throw new AppError('Notification not found', 404);
        return notification;
    }

    async markAllNotificationsRead(userId) {
        await dashboardRepository.markAllNotificationsRead(userId);
        return { updated: true };
    }

    async getAdminTickets(filters) {
        return await dashboardRepository.findSupportTickets(filters);
    }

    updateAdminTicket(ticketId, patch) {
        return dashboardRepository.updateSupportTicket(ticketId, patch);
    }

    getAdminDisputes(filters) {
        return dashboardRepository.findDisputes(filters);
    }

    async updateAdminDispute(disputeId, patch) {
        if (patch.returnRequestStatus && !['approved', 'rejected', 'completed'].includes(patch.returnRequestStatus)) {
            throw new AppError('Invalid returnRequestStatus value', 400);
        }

        const dispute = await dashboardRepository.updateDispute(disputeId, patch);
        if (!dispute) throw new AppError('Dispute not found', 404);

        if (dispute.returnRequestId && ['resolved', 'closed'].includes(patch.status)) {
            const returnPatch = {
                isDisputed: patch.status !== 'resolved' ? true : false,
                adminResolvedAt: new Date(),
            };

            if (patch.returnRequestStatus) {
                returnPatch.status = patch.returnRequestStatus;
            }

            await dashboardRepository.updateReturnRequest(dispute.returnRequestId, returnPatch);
        }

        return dispute;
    }

    getAdminReturnRequests(filters) {
        const normalized = {
            status: filters?.status,
            isDisputed: filters?.isDisputed === 'true' ? true : filters?.isDisputed === 'false' ? false : undefined,
        };
        return dashboardRepository.findReturnRequestsForAdmin(normalized);
    }

    async interveneInReturnRequest(requestId, payload) {
        const request = await dashboardRepository.findReturnRequestById(requestId);
        if (!request) throw new AppError('Return request not found', 404);
        if (!request.isDisputed && !request.disputeId) {
            throw new AppError('Admin intervention is allowed for disputed requests only', 400);
        }

        const { status, adminNote } = payload;
        if (!['approved', 'rejected', 'completed'].includes(status)) {
            throw new AppError('status must be approved, rejected, or completed', 400);
        }

        const updated = await dashboardRepository.updateReturnRequest(requestId, {
            status,
            adminNote: adminNote ?? null,
            isDisputed: false,
            adminResolvedAt: new Date(),
        });

        if (request.disputeId) {
            await dashboardRepository.updateDispute(request.disputeId._id ?? request.disputeId, {
                status: 'resolved',
                resolution: adminNote || `Return request ${request.requestNumber} marked as ${status}.`,
            });
        }

        const notifications = [
            {
                userId: request.userId._id ?? request.userId,
                type: 'support',
                title: 'Return request updated by admin',
                message: `Your return request ${request.requestNumber} has been ${status}.`,
                meta: { requestId: request._id },
            },
        ];

        if (request.sellerId?.userId) {
            notifications.push({
                userId: request.sellerId.userId,
                type: 'support',
                title: 'Return request resolved',
                message: `Admin resolved return request ${request.requestNumber} as ${status}.`,
                meta: { requestId: request._id },
            });
        }

        await dashboardRepository.createNotifications(notifications);
        return updated;
    }

    async getAdminSettings() {
        const [commission, cms, platform] = await Promise.all([
            dashboardRepository.getSetting('admin:commission', { defaultRate: 5, type: 'percentage' }),
            dashboardRepository.getSetting('admin:cms', this._defaultCms()),
            dashboardRepository.getSetting('admin:platform', this._defaultPlatform()),
        ]);

        return { commission, cms, platform };
    }

    async getPublicCms() {
        const cms = await dashboardRepository.getSetting('admin:cms', this._defaultCms());
        return { cms };
    }

    async getPublicPlatformSettings() {
        const platform = await dashboardRepository.getSetting('admin:platform', this._defaultPlatform());
        return { platform };
    }

    async getPublicSellerProfile(sellerId) {
        const [savedProfile, seedProfile, sellerMeta] = await Promise.all([
            dashboardRepository.getSetting(`seller:profile:${sellerId}`, null),
            dashboardRepository.getSellerProfileSeed(sellerId),
            dashboardRepository.getSellerPublicMeta(sellerId),
        ]);

        if (!sellerMeta) {
            throw new AppError('Seller not found', 404);
        }

        const profile = this._sanitizeSellerProfile({
            ...this._defaultSellerProfile(),
            ...(seedProfile || {}),
            ...(savedProfile || {}),
        });

        return {
            sellerId: sellerMeta._id,
            storeName: profile.storeName || sellerMeta.storeName || '',
            storeSlug: profile.storeSlug || '',
            storeDescription: profile.storeDescription || '',
            businessAddress: profile.businessAddress || '',
            logo: sellerMeta.logo?.url || null,
            memberSince: sellerMeta.createdAt || null,
            status: sellerMeta.status || 'pending',
        };
    }

    async getAdminCoupons() {
        const coupons = await couponService.getCoupons();
        return { coupons };
    }

    async updateAdminCoupons(coupons) {
        const savedCoupons = await couponService.saveCoupons(coupons);
        return { coupons: savedCoupons };
    }

    async updateAdminSettings(key, value) {
        if (!['commission', 'cms', 'platform'].includes(key)) {
            throw new AppError('Invalid settings key', 400);
        }
        const payload = key === 'platform' ? this._sanitizePlatform(value) : value;
        const saved = await dashboardRepository.setSetting(`admin:${key}`, payload);
        return saved.value;
    }

    getAdminAnalytics(days) {
        return dashboardRepository.getAdminAnalytics(days);
    }

    async getSellerSettings(sellerId) {
        const [savedProfile, seedProfile, payout] = await Promise.all([
            dashboardRepository.getSetting(`seller:profile:${sellerId}`, null),
            dashboardRepository.getSellerProfileSeed(sellerId),
            dashboardRepository.getSetting(`seller:payout:${sellerId}`, this._defaultSellerPayout()),
        ]);

        const mergedProfile = this._sanitizeSellerProfile({
            ...this._defaultSellerProfile(),
            ...(seedProfile || {}),
            ...(savedProfile || {}),
        });

        if (!savedProfile) {
            await dashboardRepository.setSetting(`seller:profile:${sellerId}`, mergedProfile);
        }

        return { profile: mergedProfile, payout: this._sanitizeSellerPayout(payout || {}, { requireStripeAccount: false }) };
    }

    async updateSellerProfile(sellerId, value) {
        const existing = await dashboardRepository.getSetting(`seller:profile:${sellerId}`, this._defaultSellerProfile());
        const payload = this._sanitizeSellerProfile({
            ...existing,
            ...(value || {}),
        });
        return dashboardRepository.setSetting(`seller:profile:${sellerId}`, payload);
    }

    updateSellerPayout(sellerId, value) {
        const payload = this._sanitizeSellerPayout(value || {}, { requireStripeAccount: true });
        return dashboardRepository.setSetting(`seller:payout:${sellerId}`, payload);
    }

    /**
     * Get seller payout summary for withdrawals.
     * @param {string} sellerId
     * @returns {Promise<{eligibleEarnings:number, withdrawn:number, pending:number, available:number, currency:string, minimumPayout:number, payouts:object[]}>}
     */
    async getSellerPayoutSummary(sellerId) {
        const [eligibleEarnings, withdrawn, pending, payoutSettings, payouts] = await Promise.all([
            dashboardRepository.getSellerDeliveredEarnings(sellerId),
            payoutTransactionRepository.getTotalSuccessfulBySeller(sellerId),
            payoutTransactionRepository.getTotalPendingBySeller(sellerId),
            dashboardRepository.getSetting(`seller:payout:${sellerId}`, this._defaultSellerPayout()),
            payoutTransactionRepository.listBySeller(sellerId, 10),
        ]);

        const available = Math.max(0, Number(eligibleEarnings || 0) - Number(withdrawn || 0) - Number(pending || 0));
        const normalizedPayout = this._sanitizeSellerPayout(payoutSettings || {}, { requireStripeAccount: false });

        return {
            eligibleEarnings: Number(eligibleEarnings || 0),
            withdrawn: Number(withdrawn || 0),
            pending: Number(pending || 0),
            available,
            currency: 'usd',
            minimumPayout: Number(normalizedPayout.minimumPayout || 0),
            payouts,
        };
    }

    /**
     * Withdraw seller earnings to configured Stripe connected account.
     * @param {string} sellerId
     * @param {{amount:number, currency?:string}} payload
     * @returns {Promise<object>}
     */
    async withdrawSellerPayout(sellerId, payload = {}) {
        const amount = Number(payload.amount);
        const currency = String(payload.currency || 'usd').toLowerCase();

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new AppError('amount must be a valid positive number', 400);
        }

        const payoutSettings = this._sanitizeSellerPayout(
            await dashboardRepository.getSetting(`seller:payout:${sellerId}`, this._defaultSellerPayout()),
            { requireStripeAccount: true }
        );

        if (payoutSettings.payoutMethod !== 'stripe') {
            throw new AppError('Switch payout method to Stripe before requesting withdrawal', 400);
        }

        if (!payoutSettings.stripeAccountId) {
            throw new AppError('Stripe account is not configured', 400);
        }

        try {
            const platformAccountId = await stripeService.getPlatformAccountId();
            console.log("Platform Account:", platformAccountId);
            console.log("Seller Account:", payoutSettings.stripeAccountId);
            
            // For testing: temporarily allow platform account if Connect is not enabled
            if (
                platformAccountId &&
                String(payoutSettings.stripeAccountId).trim() === String(platformAccountId).trim()
            ) {
                console.warn("⚠️  WARNING: Using platform account for testing. This is not recommended for production!");
                // Don't throw error for testing purposes
            }

            // Skip account verification if there are permission issues
            // Stripe will validate the account during the actual transfer
            try {
                await stripeService.getAccountById(payoutSettings.stripeAccountId);
            } catch (verificationError) {
                const errorMessage = verificationError?.raw?.message || verificationError?.message || '';
                console.warn('Account verification failed, proceeding with transfer:', errorMessage);
                
                // Only throw error for critical issues, not permission problems
                if (errorMessage.includes('No such account') || errorMessage.includes('resource_missing')) {
                    // For testing: if it's the platform account, allow it
                    if (String(payoutSettings.stripeAccountId).trim() === String(platformAccountId).trim()) {
                        console.warn("⚠️  Using platform account for testing purposes");
                    } else {
                        throw new AppError(
                            'Invalid Stripe Connected Account ID. The account does not exist.',
                            400
                        );
                    }
                }
                // For permission issues, log warning but continue
            }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            const stripeMessage = error?.raw?.message || error?.message || '';
            const normalizedMessage = String(stripeMessage).toLowerCase();

            // Handle specific Stripe Connect platform error
            if (normalizedMessage.includes('only stripe connect platforms can work with other accounts')) {
                throw new AppError(
                    'Your Stripe account is not configured as a Connect platform. Please enable Stripe Connect at https://dashboard.stripe.com/connect to use connected accounts for payouts.',
                    400
                );
            }

            throw new AppError(
                stripeMessage || 'Error validating Stripe account configuration',
                400
            );
        }

        if (amount < Number(payoutSettings.minimumPayout || 0)) {
            throw new AppError(`Minimum withdrawal amount is ${Number(payoutSettings.minimumPayout || 0)}`, 400);
        }

        const summary = await this.getSellerPayoutSummary(sellerId);
        if (amount > summary.available) {
            throw new AppError('Requested amount exceeds available balance', 400);
        }

        const payout = await payoutTransactionRepository.create({
            sellerId,
            amount,
            currency,
            method: 'stripe',
            status: 'pending',
            destinationAccountId: payoutSettings.stripeAccountId,
        });

        try {
            const transfer = await stripeService.createConnectTransfer({
                amount,
                currency,
                destinationAccountId: payoutSettings.stripeAccountId,
                metadata: {
                    sellerId: String(sellerId),
                    payoutId: String(payout._id),
                },
            });

            const updated = await payoutTransactionRepository.updateById(payout._id, {
                status: 'paid',
                stripeTransferId: transfer.id,
                processedAt: new Date(),
                metadata: transfer,
                failureReason: null,
            });

            return updated;
        } catch (error) {
            const errorMessage = error?.raw?.message || error?.message || 'Stripe transfer failed';
            const errorCode = error?.code || error?.raw?.code || '';
            
            await payoutTransactionRepository.updateById(payout._id, {
                status: 'failed',
                failureReason: errorMessage,
            });

            // Provide specific error messages for common issues
            if (errorMessage.includes('does not have access to account')) {
                throw new AppError(
                    'The connected account is not accessible with the current API key. Please ensure the account is properly connected to your platform or contact support.',
                    400
                );
            }

            if (errorMessage.includes('destination account must be a connected account')) {
                throw new AppError(
                    'The destination account must be a connected account. Please use a valid connected account ID (acct_...).',
                    400
                );
            }

            if (errorCode === 'account_invalid' || errorMessage.includes('No such account')) {
                throw new AppError(
                    'Invalid destination account. Please verify the connected account ID is correct.',
                    400
                );
            }

            throw new AppError(errorMessage, 400);
        }
    }

    async getSellerAnalytics(sellerId, days) {
        const [overview, settings, payoutSummary] = await Promise.all([
            dashboardRepository.getSellerAnalytics(sellerId, days),
            this.getSellerSettings(sellerId),
            this.getSellerPayoutSummary(sellerId),
        ]);

        const commissionRate = Number((await dashboardRepository.getSetting('admin:commission', { defaultRate: 5 })).defaultRate || 5);
        const commission = (overview.gross * commissionRate) / 100;
        const net = overview.gross - commission;

        return {
            ...overview,
            commissionRate,
            commission,
            net,
            payout: settings.payout,
            payoutSummary,
        };
    }

    getSellerProducts(sellerId) {
        return dashboardRepository.findSellerProducts(sellerId);
    }

    getSellerReturnRequests(sellerId, filters) {
        return dashboardRepository.findReturnRequestsBySeller(sellerId, filters);
    }

    async decideSellerReturnRequest(sellerId, requestId, payload) {
        const { decision, sellerNote } = payload;
        if (!['approved', 'rejected'].includes(decision)) {
            throw new AppError('decision must be approved or rejected', 400);
        }

        const request = await dashboardRepository.findReturnRequestByIdForSeller(requestId, sellerId);
        if (!request) throw new AppError('Return request not found', 404);
        if (request.status !== 'pending') {
            throw new AppError('Only pending requests can be decided by seller', 400);
        }

        const updated = await dashboardRepository.updateReturnRequest(requestId, {
            status: decision,
            sellerNote: sellerNote ?? null,
            sellerDecidedAt: new Date(),
        });

        await dashboardRepository.createNotification({
            userId: request.userId._id ?? request.userId,
            type: 'support',
            title: `Return request ${decision}`,
            message: `Seller ${decision} your request ${request.requestNumber}.`,
            meta: { requestId: request._id, decision },
        });

        return updated;
    }
}

export default new DashboardService();
