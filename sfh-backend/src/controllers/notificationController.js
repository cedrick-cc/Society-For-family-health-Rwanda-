const notificationService = require('../services/notificationService');

const listMine = async (req, res) => {
  try {
    const items = await notificationService.listForUser(req.user.userId, { take: 80 });
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load notifications.' });
  }
};

const unread = async (req, res) => {
  try {
    const count = await notificationService.unreadCount(req.user.userId);
    return res.status(200).json({ count });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to count notifications.' });
  }
};

const markOne = async (req, res) => {
  try {
    const row = await notificationService.markRead(req.user.userId, req.params.id);
    if (!row) return res.status(404).json({ message: 'Notification not found.' });
    return res.status(200).json(row);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update notification.' });
  }
};

const markAll = async (req, res) => {
  try {
    await notificationService.markAllRead(req.user.userId);
    return res.status(200).json({ message: 'All notifications marked read.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to mark notifications read.' });
  }
};

module.exports = { listMine, unread, markOne, markAll };
