const announcementService = require('../services/announcementService');

const list = async (req, res) => {
  try {
    const rows = await announcementService.listAnnouncements();
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load announcements.' });
  }
};

const create = async (req, res) => {
  try {
    const row = await announcementService.createAnnouncement({
      title: req.body.title,
      message: req.body.message,
      priority: req.body.priority,
      createdById: req.user.userId,
    });
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Create failed.' });
  }
};

const update = async (req, res) => {
  try {
    const row = await announcementService.updateAnnouncement(req.params.id, req.body);
    return res.status(200).json(row);
  } catch (error) {
    const code = error.statusCode || 400;
    return res.status(code).json({ message: error.message || 'Update failed.' });
  }
};

const remove = async (req, res) => {
  try {
    await announcementService.deleteAnnouncement(req.params.id);
    return res.status(200).json({ message: 'Deleted.' });
  } catch (error) {
    const code = error.statusCode || 400;
    return res.status(code).json({ message: error.message || 'Delete failed.' });
  }
};

module.exports = { list, create, update, remove };
