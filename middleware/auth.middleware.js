import { verifyToken } from '../utils/jwt.util.js';
import { UnauthorizedError } from '../utils/errors.util.js';
import { asyncHandler } from '../utils/async-handler.util.js';
import userRepository from '../repositories/user.repository.js';

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

    next();
});

// const authorize = (...roles) => {
//     return (req, res, next) => {
//         if (!roles.includes(req.user.role)) {
//             throw new UnauthorizedError('You do not have permission to perform this action');
//         }
//         next();
//     };
// };

export { authenticateToken };