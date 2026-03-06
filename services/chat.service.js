import conversationRepository from '../repositories/conversation.repository.js';
import sellerRepository from '../repositories/seller.repository.js';
import userRepository from '../repositories/user.repository.js';
import { sendNewMessageEmail, sendConversationStartedEmail } from '../email/send-chat-mail.js';
import { AppError } from '../utils/errors.util.js';
import logger from '../utils/logger.util.js';

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';

class ChatService {
    // ── Conversations ──────────────────────────────────────────────────────────

    async startConversation(userId, sellerId, subject = '', orderId = null) {
        const seller = await sellerRepository.findById(sellerId);
        if (!seller) throw new AppError('Seller not found', 404);

        const { conversations: existing } = await conversationRepository.findByUser(userId, 1, 200);
        const alreadyExists = existing.some(c => c.sellerId._id.toString() === sellerId);

        const conversation = await conversationRepository.findOrCreate(userId, sellerId, subject, orderId);

        if (!alreadyExists) {
            const [user, sellerUser] = await Promise.all([
                userRepository.findById(userId),
                userRepository.findById(seller.userId),
            ]);
            if (sellerUser?.email) {
                sendConversationStartedEmail({
                    recipientEmail: sellerUser.email,
                    recipientName: sellerUser.firstName,
                    senderName: `${user.firstName} ${user.lastName || ''}`.trim(),
                    subject,
                    conversationLink: `${FRONTEND_URL}/seller/messaging?conversation=${conversation._id}`,
                }).catch(err => logger.error('Chat start email:', err));
            }
        }

        return conversationRepository.findById(conversation._id);
    }

    async getUserConversations(userId, page, limit) {
        return conversationRepository.findByUser(userId, page, limit);
    }

    async getSellerConversations(sellerId, page, limit) {
        return conversationRepository.findBySeller(sellerId, page, limit);
    }

    async getConversationById(conversationId, requesterId, role) {
        const conversation = await conversationRepository.findById(conversationId);
        if (!conversation) throw new AppError('Conversation not found', 404);
        this._assertAccess(conversation, requesterId, role);
        return conversation;
    }

    // ── Messages ───────────────────────────────────────────────────────────────

    async getMessages(conversationId, requesterId, role, page, limit) {
        const conv = await conversationRepository.findById(conversationId);
        if (!conv) throw new AppError('Conversation not found', 404);
        this._assertAccess(conv, requesterId, role);

        await conversationRepository.markMessagesRead(conversationId, role);
        const resetField = role === 'user' ? 'unreadByUser' : 'unreadBySeller';
        await conversationRepository.resetUnread(conversationId, resetField);

        return conversationRepository.findMessages(conversationId, page, limit);
    }

    async sendMessage(conversationId, senderId, senderRole, body, attachment = null) {
        const conversation = await conversationRepository.findById(conversationId);
        if (!conversation) throw new AppError('Conversation not found', 404);
        this._assertAccess(conversation, senderId, senderRole);

        if (!body?.trim() && !attachment) throw new AppError('Message must have text or attachment', 400);

        const messageType = attachment
            ? (attachment.type === 'image' ? 'image' : 'file')
            : 'text';

        const message = await conversationRepository.createMessage({
            conversationId,
            senderId,
            senderRole,
            body: body?.trim() || '',
            attachment: attachment || null,
            messageType,
        });

        const preview = body?.trim() || (attachment ? `📎 ${attachment.originalName || 'File'}` : '');
        const incrementField = senderRole === 'user' ? 'unreadBySeller' : 'unreadByUser';
        await conversationRepository.updateLastMessage(conversationId, preview, incrementField);

        // Email notification (fire-and-forget)
        this._sendMessageNotification(conversation, senderId, senderRole, preview)
            .catch(err => logger.error('Message email error:', err));

        return message;
    }

    async reactToMessage(messageId, emoji, userId) {
        return conversationRepository.addReaction(messageId, emoji, userId);
    }

    async removeReaction(messageId, userId) {
        return conversationRepository.removeReaction(messageId, userId);
    }

    async deleteMessage(messageId, userId) {
        const msg = await conversationRepository.softDeleteMessage(messageId, userId);
        if (!msg) throw new AppError('Message not found or unauthorized', 404);
        return msg;
    }

    async markRead(conversationId, requesterId, role) {
        const conv = await conversationRepository.findById(conversationId);
        if (!conv) throw new AppError('Conversation not found', 404);
        this._assertAccess(conv, requesterId, role);
        await conversationRepository.markMessagesRead(conversationId, role);
        const resetField = role === 'user' ? 'unreadByUser' : 'unreadBySeller';
        return conversationRepository.resetUnread(conversationId, resetField);
    }

    async getUnreadCount(userId, role, sellerId = null) {
        if (role === 'seller') return conversationRepository.totalUnreadForSeller(sellerId);
        return conversationRepository.totalUnreadForUser(userId);
    }

    // ── Private ────────────────────────────────────────────────────────────────

    _assertAccess(conversation, requesterId, role) {
        // conversation.userId can be populated object or raw ObjectId
        const convUserId = conversation.userId?._id?.toString() || conversation.userId?.toString();
        // conversation.sellerId can be populated Seller doc (with .userId sub-field) or raw ObjectId
        const convSellerUserId = conversation.sellerId?.userId?._id?.toString()
            || conversation.sellerId?.userId?.toString();
        // Also allow matching on the Seller doc _id directly (for when sellerId is not populated)
        const convSellerDocId = conversation.sellerId?._id?.toString()
            || conversation.sellerId?.toString();

        const isUser   = role === 'user'   && convUserId === requesterId;
        const isSeller = role === 'seller' && (convSellerUserId === requesterId || convSellerDocId === requesterId);

        if (!isUser && !isSeller) throw new AppError('Access denied', 403);
    }

    async _sendMessageNotification(conversation, senderId, senderRole, preview) {
        const previewText = preview.length > 120 ? preview.substring(0, 120) + '…' : preview;

        if (senderRole === 'user') {
            const seller = conversation.sellerId;
            const [sellerUser, sender] = await Promise.all([
                userRepository.findById(seller.userId?._id || seller.userId),
                userRepository.findById(senderId),
            ]);
            if (sellerUser?.email) {
                await sendNewMessageEmail({
                    recipientEmail: sellerUser.email,
                    recipientName: sellerUser.firstName,
                    senderName: `${sender.firstName} ${sender.lastName || ''}`.trim(),
                    messagePreview: previewText,
                    conversationLink: `${FRONTEND_URL}/seller/messaging?conversation=${conversation._id}`,
                });
            }
        } else {
            const [buyer, sender] = await Promise.all([
                userRepository.findById(conversation.userId._id),
                userRepository.findById(senderId),
            ]);
            if (buyer?.email) {
                await sendNewMessageEmail({
                    recipientEmail: buyer.email,
                    recipientName: buyer.firstName,
                    senderName: conversation.sellerId?.storeName || `${sender.firstName}`,
                    messagePreview: previewText,
                    conversationLink: `${FRONTEND_URL}/messages?conversation=${conversation._id}`,
                });
            }
        }
    }
}

export default new ChatService();