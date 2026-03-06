import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';

class ConversationRepository {
    // ── Conversations ─────────────────────────────────────────────────────────

    async findOrCreate(userId, sellerId, subject = '', orderId = null) {
        let conversation = await Conversation.findOne({ userId, sellerId });
        if (!conversation) {
            conversation = await Conversation.create({ userId, sellerId, subject, orderId });
        }
        return conversation;
    }

    async findById(id) {
        return Conversation.findById(id)
            .populate('userId', 'firstName lastName email avatar')
            .populate({ path: 'sellerId', populate: { path: 'userId', select: 'firstName lastName email avatar' } })
            .populate('orderId', 'orderNumber totalAmount status');
    }

    async findByUser(userId, page = 1, limit = 30) {
        const skip = (page - 1) * limit;
        const [conversations, total] = await Promise.all([
            Conversation.find({ userId, isArchived: false })
                .populate({ path: 'sellerId', populate: { path: 'userId', select: 'firstName lastName email avatar' } })
                .populate('orderId', 'orderNumber')
                .sort({ lastMessageAt: -1 })
                .skip(skip).limit(limit),
            Conversation.countDocuments({ userId, isArchived: false }),
        ]);
        return { conversations, total, page, limit };
    }

    async findBySeller(sellerId, page = 1, limit = 30) {
        const skip = (page - 1) * limit;
        const [conversations, total] = await Promise.all([
            Conversation.find({ sellerId, isArchived: false })
                .populate('userId', 'firstName lastName email avatar')
                .populate('orderId', 'orderNumber')
                .sort({ lastMessageAt: -1 })
                .skip(skip).limit(limit),
            Conversation.countDocuments({ sellerId, isArchived: false }),
        ]);
        return { conversations, total, page, limit };
    }

    async updateLastMessage(conversationId, text, incrementField) {
        const update = { lastMessage: text, lastMessageAt: new Date() };
        if (incrementField) update.$inc = { [incrementField]: 1 };
        return Conversation.findByIdAndUpdate(conversationId, update, { new: true });
    }

    async resetUnread(conversationId, field) {
        return Conversation.findByIdAndUpdate(conversationId, { [field]: 0 }, { new: true });
    }

    // ── Messages ──────────────────────────────────────────────────────────────

    async createMessage(data) {
        const msg = await Message.create(data);
        return msg.populate('senderId', 'firstName lastName avatar');
    }

    async findMessages(conversationId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const total = await Message.countDocuments({ conversationId, deletedAt: null });
        // Fetch latest page (sort desc, then reverse for display)
        const messages = await Message.find({ conversationId, deletedAt: null })
            .populate('senderId', 'firstName lastName avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .then(r => r.reverse());
        return { messages, total, page, limit, hasMore: skip + limit < total };
    }

    async markMessagesRead(conversationId, senderRole) {
        const otherRole = senderRole === 'user' ? 'seller' : 'user';
        return Message.updateMany(
            { conversationId, senderRole: otherRole, isRead: false },
            { isRead: true, readAt: new Date() }
        );
    }

    async addReaction(messageId, emoji, userId) {
        // Remove existing reaction from same user, then add new
        await Message.findByIdAndUpdate(messageId, { $pull: { reactions: { userId } } });
        return Message.findByIdAndUpdate(
            messageId,
            { $push: { reactions: { emoji, userId } } },
            { new: true }
        ).populate('senderId', 'firstName lastName avatar');
    }

    async removeReaction(messageId, userId) {
        return Message.findByIdAndUpdate(
            messageId,
            { $pull: { reactions: { userId } } },
            { new: true }
        );
    }

    async softDeleteMessage(messageId, userId) {
        return Message.findOneAndUpdate(
            { _id: messageId, senderId: userId },
            { deletedAt: new Date(), body: '', attachment: null },
            { new: true }
        );
    }

    async totalUnreadForUser(userId) {
        const result = await Conversation.aggregate([
            { $match: { userId: userId } },
            { $group: { _id: null, total: { $sum: '$unreadByUser' } } },
        ]);
        return result[0]?.total || 0;
    }

    async totalUnreadForSeller(sellerId) {
        const result = await Conversation.aggregate([
            { $match: { sellerId: sellerId } },
            { $group: { _id: null, total: { $sum: '$unreadBySeller' } } },
        ]);
        return result[0]?.total || 0;
    }
}

export default new ConversationRepository();