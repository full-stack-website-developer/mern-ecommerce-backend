import { verifyToken } from '../utils/jwt.util.js';
import userRepository from '../repositories/user.repository.js';
import chatService from '../services/chat.service.js';
import sellerRepository from '../repositories/seller.repository.js';
import logger from '../utils/logger.util.js';

// userId → Set<socketId>
const onlineUsers = new Map();

const addUser = (userId, socketId) => {
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socketId);
};

const removeUser = (userId, socketId) => {
    if (!onlineUsers.has(userId)) return;
    onlineUsers.get(userId).delete(socketId);
    if (onlineUsers.get(userId).size === 0) onlineUsers.delete(userId);
};

export const isOnline  = (userId) => onlineUsers.has(userId);
export const onlineSet = () => new Set(onlineUsers.keys());

export const initSocketIO = (io) => {

    // ── Auth ──────────────────────────────────────────────────────────────────
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token
                || socket.handshake.headers?.authorization?.split(' ')[1];
            if (!token) return next(new Error('No token'));

            const decoded = verifyToken(token);
            if (!decoded) return next(new Error('Invalid token'));

            const user = await userRepository.findById(decoded.id);
            if (!user) return next(new Error('User not found'));

            socket.userId   = decoded.id;
            socket.userRole = user.role;
            socket.user     = {
                id:   decoded.id,
                role: user.role,
                name: `${user.firstName} ${user.lastName || ''}`.trim(),
            };

            if (user.role === 'seller') {
                const seller    = await sellerRepository.getByUserId(decoded.id);
                socket.sellerId = seller?._id?.toString();
            }
            next();
        } catch {
            next(new Error('Auth failed'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;
        const wasOnline = isOnline(userId);
        addUser(userId, socket.id);

        logger.info(`[Socket] connected: ${userId} (${socket.userRole})`);

        // ── Join personal rooms ──────────────────────────────────────────────
        socket.join(`user:${userId}`);
        if (socket.userRole === 'seller' && socket.sellerId) {
            socket.join(`seller:${socket.sellerId}`);
        }

        // Broadcast presence to everyone — only on first socket for this user
        if (!wasOnline) {
            io.emit('user_online', { userId });
        }

        // ── Conversation rooms ───────────────────────────────────────────────
        socket.on('join_conversation', (conversationId) => {
            socket.join(`conv:${conversationId}`);
        });

        socket.on('leave_conversation', (conversationId) => {
            socket.leave(`conv:${conversationId}`);
        });

        // ── Presence query ───────────────────────────────────────────────────
        // Client sends list of userIds and gets back which are online
        socket.on('check_presence', (userIds, ack) => {
            if (!Array.isArray(userIds)) return ack?.({});
            const result = {};
            userIds.forEach(id => { result[id] = isOnline(id); });
            ack?.(result);
        });

        // ── Typing ───────────────────────────────────────────────────────────
        socket.on('typing_start', ({ conversationId }) => {
            socket.to(`conv:${conversationId}`).emit('user_typing', {
                conversationId,
                userId,
                name: socket.user.name,
            });
        });

        socket.on('typing_stop', ({ conversationId }) => {
            socket.to(`conv:${conversationId}`).emit('user_stop_typing', {
                conversationId,
                userId,
            });
        });

        // ── Reactions ────────────────────────────────────────────────────────
        socket.on('react_message', async ({ messageId, emoji, conversationId }, ack) => {
            try {
                const message = await chatService.reactToMessage(messageId, emoji, userId);
                io.to(`conv:${conversationId}`).emit('message_reaction', { message, conversationId });
                ack?.({ success: true });
            } catch (err) {
                ack?.({ success: false, error: err.message });
            }
        });

        // ── Delete ───────────────────────────────────────────────────────────
        socket.on('delete_message', async ({ messageId, conversationId }, ack) => {
            try {
                await chatService.deleteMessage(messageId, userId);
                io.to(`conv:${conversationId}`).emit('message_deleted', { messageId, conversationId });
                ack?.({ success: true });
            } catch (err) {
                ack?.({ success: false, error: err.message });
            }
        });

        // ── Mark read ────────────────────────────────────────────────────────
        socket.on('mark_read', async ({ conversationId }) => {
            try {
                const role = socket.userRole === 'seller' ? 'seller' : 'user';
                await chatService.markRead(conversationId, userId, role);
                io.to(`conv:${conversationId}`).emit('messages_read', { conversationId, by: role });
            } catch (err) {
                logger.error('[Socket] mark_read error:', err);
            }
        });

        // ── Disconnect ───────────────────────────────────────────────────────
        socket.on('disconnect', () => {
            removeUser(userId, socket.id);
            // Only broadcast offline when ALL tabs close
            if (!isOnline(userId)) {
                io.emit('user_offline', { userId, lastSeen: new Date().toISOString() });
            }
            logger.info(`[Socket] disconnected: ${userId}`);
        });
    });
};