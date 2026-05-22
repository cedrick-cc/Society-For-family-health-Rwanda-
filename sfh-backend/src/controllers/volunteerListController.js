const volunteerListService = require('../services/volunteerListService');

const listVolunteers = async (req, res) => {
  try {
    const volunteers = await volunteerListService.listVolunteers({
      search: req.query.search,
      status: req.query.status,
      opsStatus: req.query.opsStatus,
    });
    return res.status(200).json(volunteers);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch volunteers.' });
  }
};

module.exports = { listVolunteers };
