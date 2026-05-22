const express = require('express');
const messagingController = require('../controllers/messagingController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/conversations', authenticate, messagingController.listConversations);
router.get('/conversations/unread-total', authenticate, messagingController.unreadTotal);
router.get('/messaging/user-search', authenticate, messagingController.searchUsers);
router.post('/conversations', authenticate, messagingController.createConversation);
router.get('/conversations/:id/messages', authenticate, messagingController.getMessages);
router.post('/conversations/:id/messages', authenticate, messagingController.sendMessage);
router.patch('/conversations/:id/read', authenticate, messagingController.markRead);

module.exports = router;
