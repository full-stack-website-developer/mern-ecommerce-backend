import { verifyToken } from '../utils/jwt.util.js';
import { UnauthorizedError } from '../utils/errors.util.js';
import { asyncHandler } from '../utils/async-handler.util.js';
import userRepository from '../repositories/user.repository.js';
import { optionalAuth } from './optionalAuth.middleware.js';
import sellerRepository from '../repositories/seller.repository.js';

const authenticateToken = asyncHandler(async (req, res, next) => {
    // Extract token
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        throw new UnauthorizedError('Invalid token format');
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
        throw new UnauthorizedError('Invalid or expired token');
    }

    // Optional: Check if user still exists
    const user = await userRepository.findById(decoded.id);
    if (!user) {
        throw new UnauthorizedError('User no longer exists');
    }

    // Attach user to request
    req.user = {
        id: decoded.id,
        role: user.role
    };

    if (user.role === 'seller') {
        const seller = await sellerRepository.getByUserId(user._id);
        if (!seller) {
            throw new UnauthorizedError('Seller profile not found');
        }
        req.user.sellerId = seller._id;
        req.user.sellerStatus = seller.status;
    }

    next();
});

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            throw new UnauthorizedError('You do not have permission to perform this action');
        }
        next();
    };
};

const requireApprovedSeller = (req, _res, next) => {
    if (req.user?.role !== 'seller') return next();
    if (req.user?.sellerStatus !== 'approved') {
        throw new UnauthorizedError('Seller account is not approved');
    }
    next();
};

export { authorize, authenticateToken, optionalAuth, requireApprovedSeller };
