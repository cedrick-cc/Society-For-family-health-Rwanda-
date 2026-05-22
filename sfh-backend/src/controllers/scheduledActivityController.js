const scheduledActivityService = require('../services/scheduledActivityService');

const create = async (req, res) => {
  try {
    const activity = await scheduledActivityService.createActivity(req.user.userId, req.body);
    return res.status(201).json(activity);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Failed to create activity.' });
  }
};

const list = async (req, res) => {
  try {
    const activities = await scheduledActivityService.listActivities(req.user);
    return res.status(200).json(activities);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to list activities.' });
  }
};

const getOne = async (req, res) => {
  try {
    const activity = await scheduledActivityService.getActivity(req.params.id, req.user);
    return res.status(200).json(activity);
  } catch (error) {
    const code = error.message === 'Forbidden.' ? 403 : error.message.includes('not found') ? 404 : 500;
    return res.status(code).json({ message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const activity = await scheduledActivityService.updateActivity(req.params.id, req.user, req.body);
    return res.status(200).json(activity);
  } catch (error) {
    const code = error.message === 'Forbidden.' ? 403 : 400;
    return res.status(code).json({ message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const result = await scheduledActivityService.deleteActivity(req.params.id, req.user);
    return res.status(200).json(result);
  } catch (error) {
    const code = error.message === 'Forbidden.' ? 403 : 404;
    return res.status(code).json({ message: error.message });
  }
};

module.exports = { create, list, getOne, update, remove };
