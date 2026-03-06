// ─────────────────────────────────────────────────────────────────────────────
//  optionalAuth  — add this to your auth.middleware.js
//
//  🎓 WHY THIS EXISTS:
//  Your existing `authenticateToken` throws UnauthorizedError when there
//  is NO token. That blocks guests from placing orders.
//
//  `optionalAuth` is a softer version:
//    ✅  Token present + valid   → sets req.user = { id, role }
//    ✅  No token at all         → sets req.user = null, continues
//    ❌  Token present + INVALID → still blocks (security: forged/expired token)
//
//  Usage in routes:
//    router.post('/orders', optionalAuth, orderController.placeOrder)
//
//  In the controller:
//    const userId = req.user?.id ?? null;    ← null means guest
// ─────────────────────────────────────────────────────────────────────────────

import { verifyToken } from '../utils/jwt.util.js';
import { UnauthorizedError } from '../utils/errors.util.js';
import { asyncHandler } from '../utils/async-handler.util.js';
import userRepository from '../repositories/user.repository.js';
import sellerRepository from '../repositories/seller.repository.js';

// ── Paste this into your existing auth.middleware.js ─────────────────────────

const optionalAuth = asyncHandler(async (req, res, next) => {
    const authHeader = req.header('Authorization');

    // No token — guest user, just continue
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        req.user = null;
        return next();
    }

    // Token exists — must be valid (forged/expired tokens are rejected)
    const decoded = verifyToken(token);
    if (!decoded) {
        throw new UnauthorizedError('Invalid or expired token');
    }

    const user = await userRepository.findById(decoded.id);
    if (!user) {
        throw new UnauthorizedError('User no longer exists');
    }

    req.user = { id: decoded.id, role: user.role };
    if (user.role === 'seller') {
        const seller = await sellerRepository.getByUserId(user._id);
        if (!seller) {
            throw new UnauthorizedError('Seller profile not found');
        }
        
        req.user.sellerId = seller._id;
        req.user.sellerStatus = seller.status;
    }

    return next();
});

export { optionalAuth };

// ── Also add this to your existing export line in auth.middleware.js ──────────
// export { authorize, authenticateToken, optionalAuth };
