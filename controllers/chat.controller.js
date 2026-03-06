import chatService from '../services/chat.service.js';
import conversationRepository from '../repositories/conversation.repository.js';
import sellerRepository from '../repositories/seller.repository.js';
import { asyncHandler } from '../utils/async-handler.util.js';
import ApiResponse from '../utils/response.util.js';
import { AppError } from '../utils/errors.util.js';

const parsePage  = (q) => Math.max(1, parseInt(q) || 1);
const parseLimit = (q, max = 50) => Math.min(max, Math.max(1, parseInt(q) || 20));

const getSellerDoc = async (userId) => {
    const seller = await sellerRepository.getByUserId(userId);
    if (!seller) throw new AppError('Seller profile not found', 404);
    return seller;
};

// ── Emit helper: broadcasts to the conversation room AND to each participant's
//    personal room so the receiver gets the event even if they haven't called
//    joinConversation yet (e.g. they have the conversation list open but not
//    the specific chat pane).
const broadcastNewMessage = (io, conversation, message) => {
    if (!io) return;

    const convRoom = `conv:${conversation._id}`;

    // Always emit to the room (anyone who called join_conversation)
    io.to(convRoom).emit('new_message', {
        message,
        conversationId: conversation._id.toString(),
    });

    // Also emit to each participant's personal room (user:ID / seller:SELLERID)
    // so the conversation list badge updates in real time
    const userId   = conversation.userId?._id?.toString()   || conversation.userId?.toString();
    const sellerId = conversation.sellerId?._id?.toString() || conversation.sellerId?.toString();

    if (userId)   io.to(`user:${userId}`)    .emit('new_message', { message, conversationId: conversation._id.toString() });
    if (sellerId) io.to(`seller:${sellerId}`).emit('new_message', { message, conversationId: conversation._id.toString() });

    // Conversation list refresh
    io.to(convRoom).emit('conversation_updated', { conversationId: conversation._id.toString() });
    if (userId)   io.to(`user:${userId}`)    .emit('conversation_updated', { conversationId: conversation._id.toString() });
    if (sellerId) io.to(`seller:${sellerId}`).emit('conversation_updated', { conversationId: conversation._id.toString() });
};

// ── Conversations ──────────────────────────────────────────────────────────────

export const startConversation = asyncHandler(async (req, res) => {
    const { sellerId, subject, orderId } = req.body;
    if (!sellerId) throw new AppError('sellerId is required', 400);
    // Allow any authenticated user to start a conversation (service validates seller exists)
    const conversation = await chatService.startConversation(req.user.id, sellerId, subject || '', orderId || null);
    return ApiResponse.success(res, { conversation }, 'Conversation started', 201);
});

// Smart endpoint — returns seller conversations if role=seller, buyer conversations otherwise
export const getMyConversations = asyncHandler(async (req, res) => {
    const page  = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);

    if (req.user.role === 'seller') {
        const seller = await getSellerDoc(req.user.id);
        const result = await chatService.getSellerConversations(seller._id, page, limit);
        return ApiResponse.success(res, result, 'Conversations retrieved');
    }

    const result = await chatService.getUserConversations(req.user.id, page, limit);
    return ApiResponse.success(res, result, 'Conversations retrieved');
});

export const getUserConversations = asyncHandler(async (req, res) => {
    // If a seller hits this endpoint, redirect to seller conversations silently
    if (req.user.role === 'seller') {
        const seller = await getSellerDoc(req.user.id);
        const result = await chatService.getSellerConversations(seller._id, parsePage(req.query.page), parseLimit(req.query.limit));
        return ApiResponse.success(res, result, 'Conversations retrieved');
    }
    const result = await chatService.getUserConversations(req.user.id, parsePage(req.query.page), parseLimit(req.query.limit));
    return ApiResponse.success(res, result, 'Conversations retrieved');
});

export const getSellerConversations = asyncHandler(async (req, res) => {
    const seller = await getSellerDoc(req.user.id);
    const result = await chatService.getSellerConversations(seller._id, parsePage(req.query.page), parseLimit(req.query.limit));
    return ApiResponse.success(res, result, 'Conversations retrieved');
});

export const getConversationById = asyncHandler(async (req, res) => {
    const role = req.user.role === 'seller' ? 'seller' : 'user';
    const conversation = await chatService.getConversationById(req.params.id, req.user.id, role);
    return ApiResponse.success(res, { conversation }, 'Conversation retrieved');
});

// ── Messages ───────────────────────────────────────────────────────────────────

export const getMessages = asyncHandler(async (req, res) => {
    const role = req.user.role === 'seller' ? 'seller' : 'user';
    const result = await chatService.getMessages(
        req.params.conversationId, req.user.id, role,
        parsePage(req.query.page), parseLimit(req.query.limit)
    );
    return ApiResponse.success(res, result, 'Messages retrieved');
});

export const sendMessage = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { body } = req.body;

    // File upload (multer + Cloudinary already ran)
    let attachment = null;
    if (req.file) {
        const mime = req.file.mimetype || '';
        attachment = {
            url: req.file.path,
            publicId: req.file.filename,
            originalName: req.file.originalname,
            mimeType: mime,
            size: req.file.size || 0,
            type: mime.startsWith('image/') ? 'image' : 'file',
        };
    }

    if (!body?.trim() && !attachment) throw new AppError('Message must have text or attachment', 400);

    const senderRole   = req.user.role === 'seller' ? 'seller' : 'user';
    const message      = await chatService.sendMessage(conversationId, req.user.id, senderRole, body?.trim() || '', attachment);

    // Need the full populated conversation to get both participant IDs
    const conversation = await conversationRepository.findById(conversationId);
    broadcastNewMessage(req.app.get('io'), conversation, message);

    return ApiResponse.success(res, { message }, 'Message sent', 201);
});

export const reactToMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { emoji, conversationId } = req.body;
    if (!emoji) throw new AppError('emoji is required', 400);
    const message = await chatService.reactToMessage(messageId, emoji, req.user.id);
    const io = req.app.get('io');
    if (io && conversationId) io.to(`conv:${conversationId}`).emit('message_reaction', { message, conversationId });
    return ApiResponse.success(res, { message }, 'Reaction added');
});

export const removeReaction = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { conversationId } = req.body;
    const message = await chatService.removeReaction(messageId, req.user.id);
    const io = req.app.get('io');
    if (io && conversationId) io.to(`conv:${conversationId}`).emit('message_reaction', { message, conversationId });
    return ApiResponse.success(res, { message }, 'Reaction removed');
});

export const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { conversationId } = req.body;
    await chatService.deleteMessage(messageId, req.user.id);
    const io = req.app.get('io');
    if (io && conversationId) io.to(`conv:${conversationId}`).emit('message_deleted', { messageId, conversationId });
    return ApiResponse.success(res, null, 'Message deleted');
});

export const markRead = asyncHandler(async (req, res) => {
    const role = req.user.role === 'seller' ? 'seller' : 'user';
    await chatService.markRead(req.params.conversationId, req.user.id, role);
    return ApiResponse.success(res, null, 'Messages marked as read');
});

export const getUnreadCount = asyncHandler(async (req, res) => {
    let count;
    if (req.user.role === 'seller') {
        const seller = await getSellerDoc(req.user.id);
        count = await chatService.getUnreadCount(req.user.id, 'seller', seller._id);
    } else {
        count = await chatService.getUnreadCount(req.user.id, 'user');
    }
    return ApiResponse.success(res, { count }, 'Unread count retrieved');
});