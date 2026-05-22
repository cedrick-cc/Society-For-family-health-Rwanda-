const analyticsService = require('../services/analyticsService');

const getAnalytics = async (req, res) => {
  try {
    const period = ['weekly', 'monthly', 'yearly'].includes(req.query.period)
      ? req.query.period
      : 'monthly';
    const data = await analyticsService.getAnalytics(period);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load analytics.' });
  }
};

module.exports = { getAnalytics };
