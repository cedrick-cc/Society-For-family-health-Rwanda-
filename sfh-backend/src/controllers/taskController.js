const taskService = require('../services/taskService');

const listMine = async (req, res) => {
  try {
    const tasks = await taskService.listMine(req.user.userId);
    return res.status(200).json(tasks);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load tasks.' });
  }
};

const listManaged = async (req, res) => {
  try {
    const allowed = ['FIELD_MANAGER', 'ADMIN', 'COORDINATOR'];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }
    const tasks = await taskService.listCreatedByFieldManager(req.user.userId, req.user.role);
    return res.status(200).json(tasks);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load tasks.' });
  }
};

const create = async (req, res) => {
  try {
    const allowed = ['FIELD_MANAGER', 'ADMIN', 'COORDINATOR'];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }
    const task = await taskService.createTask(req.body, req.user.userId, req.user.role);
    return res.status(201).json(task);
  } catch (error) {
    const code = error.statusCode || 400;
    return res.status(code).json({ message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.body, req.user.userId, req.user.role);
    return res.status(200).json(task);
  } catch (error) {
    const code = error.statusCode || 400;
    return res.status(code).json({ message: error.message });
  }
};

module.exports = { listMine, listManaged, create, update };
