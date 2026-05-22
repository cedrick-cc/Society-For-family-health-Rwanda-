const activityLogService = require('../services/activityLogService');

const listRecent = async (req, res) => {
  try {
    const take = Math.min(100, Number(req.query.take) || 30);
    const items = await activityLogService.listRecent({ take, actionType: req.query.actionType });
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load activity.' });
  }
};

module.exports = { listRecent };
