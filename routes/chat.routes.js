import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth.middleware.js';
import { createUploader } from '../utils/cloudinary-uploader.util.js';
import Conversation from '../models/conversation.model.js';
import sellerRepository from '../repositories/seller.repository.js';
import {
    startConversation,
    getMyConversations,
    getUserConversations,
    getSellerConversations,
    getConversationById,
    getMessages,
    sendMessage,
    reactToMessage,
    removeReaction,
    deleteMessage,
    markRead,
    getUnreadCount,
} from '../controllers/chat.controller.js';

const router = Router();

const uploadAttachment = createUploader({
    folder: 'chat/attachments',
    resourceType: 'auto',
    formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip'],
    maxSizeMB: 20,
});

router.use(authenticateToken);

// ── DEBUG endpoint (remove after fixing) ─────────────────────────────────────
router.get('/debug', async (req, res) => {
    try {
        const sellerDoc = req.user.role === 'seller'
            ? await sellerRepository.getByUserId(req.user.id)
            : null;

        const allConvs = await Conversation.find({}).lean();

        res.json({
            currentUser: {
                userId: req.user.id,
                role: req.user.role,
            },
            sellerDoc: sellerDoc
                ? { _id: sellerDoc._id.toString(), userId: sellerDoc.userId.toString(), status: sellerDoc.status }
                : null,
            allConversations: allConvs.map(c => ({
                _id: c._id.toString(),
                userId: c.userId.toString(),
                sellerId: c.sellerId.toString(),
                isArchived: c.isArchived,
                lastMessage: c.lastMessage,
                match_sellerId_eq_sellerDoc: sellerDoc
                    ? c.sellerId.toString() === sellerDoc._id.toString()
                    : 'n/a',
            })),
            queryWouldReturn: sellerDoc
                ? allConvs.filter(c => c.sellerId.toString() === sellerDoc._id.toString() && !c.isArchived).length
                : 'no seller doc',
        });
    } catch (e) {
        res.json({ error: e.message, stack: e.stack });
    }
});

// Unread badge
router.get('/unread-count', getUnreadCount);

// Conversations
// Any logged-in user can start a conversation (sellers contacting buyers etc. prevented in service layer)
router.post('/conversations', startConversation);
// Smart endpoint - returns buyer or seller conversations based on role automatically
router.get('/conversations/me', getMyConversations);
// Keep old endpoints for backwards compat (no authorize guard so sellers can use /user too)
router.get('/conversations/user', getUserConversations);
router.get('/conversations/seller', getSellerConversations);
router.get('/conversations/:id', getConversationById);

// Messages
router.get('/conversations/:conversationId/messages', getMessages);
router.post(
    '/conversations/:conversationId/messages',
    uploadAttachment.single('attachment'),
    sendMessage
);
router.patch('/conversations/:conversationId/read', markRead);

// Reactions
router.post('/messages/:messageId/react', reactToMessage);
router.delete('/messages/:messageId/react', removeReaction);

// Delete message
router.delete('/messages/:messageId', deleteMessage);

export default router;