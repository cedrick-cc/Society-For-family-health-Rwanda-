const messagingService = require('../services/messagingService');

const listConversations = async (req, res) => {
  try {
    const list = await messagingService.listConversations(req.user.userId);
    return res.status(200).json(list);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load conversations.' });
  }
};

const createConversation = async (req, res) => {
  try {
    const { peerUserId } = req.body;
    if (!peerUserId) return res.status(400).json({ message: 'peerUserId is required.' });
    const conv = await messagingService.getOrCreateConversation(
      req.user.userId,
      req.user.role,
      peerUserId
    );
    return res.status(200).json(conv);
  } catch (error) {
    const code = error.statusCode || 400;
    return res.status(code).json({ message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const messages = await messagingService.listMessages(req.params.id, req.user.userId);
    return res.status(200).json(messages);
  } catch (error) {
    const code = error.statusCode || 500;
    return res.status(code).json({ message: error.message || 'Failed to load messages.' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const msg = await messagingService.sendMessage(req.params.id, req.user.userId, content);
    return res.status(201).json(msg);
  } catch (error) {
    const code = error.statusCode || 400;
    return res.status(code).json({ message: error.message });
  }
};

const markRead = async (req, res) => {
  try {
    const result = await messagingService.markConversationRead(req.params.id, req.user.userId);
    return res.status(200).json(result);
  } catch (error) {
    const code = error.statusCode || 500;
    return res.status(code).json({ message: error.message || 'Failed to mark read.' });
  }
};

const unreadTotal = async (req, res) => {
  try {
    const count = await messagingService.unreadMessagesTotal(req.user.userId);
    return res.status(200).json({ count });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to count messages.' });
  }
};

const searchUsers = async (req, res) => {
  try {
    const q = req.query.q || req.query.query || '';
    const list = await messagingService.searchMessagingPeers(req.user.userId, req.user.role, q);
    return res.status(200).json(list);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to search users.' });
  }
};

module.exports = {
  listConversations,
  createConversation,
  getMessages,
  sendMessage,
  markRead,
  unreadTotal,
  searchUsers,
};
