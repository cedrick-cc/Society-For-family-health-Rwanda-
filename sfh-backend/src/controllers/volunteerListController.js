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

const getVolunteer = async (req, res) => {
  try {
    const row = await volunteerListService.getVolunteerDetail(req.params.id);
    return res.status(200).json(row);
  } catch (error) {
    const code = error.statusCode || 500;
    return res.status(code).json({ message: error.message || 'Failed to load volunteer.' });
  }
};

const updateVolunteer = async (req, res) => {
  try {
    const row = await volunteerListService.updateVolunteer(req.params.id, req.body);
    return res.status(200).json(row);
  } catch (error) {
    const code = error.statusCode || 400;
    return res.status(code).json({ message: error.message || 'Update failed.' });
  }
};

const deactivateVolunteer = async (req, res) => {
  try {
    const row = await volunteerListService.deactivateVolunteer(req.params.id);
    return res.status(200).json(row);
  } catch (error) {
    const code = error.statusCode || 400;
    return res.status(code).json({ message: error.message || 'Deactivate failed.' });
  }
};

module.exports = { listVolunteers, getVolunteer, updateVolunteer, deactivateVolunteer };
