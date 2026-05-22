const resourceService = require('../services/resourceService');

const list = async (req, res) => {
  try {
    const { category, programType } = req.query;
    const items = programType
      ? await resourceService.listByProgramType(String(programType))
      : await resourceService.listResources({ category: category || undefined });
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load resources.' });
  }
};

const create = async (req, res) => {
  try {
    const row = await resourceService.createResource(req.body, req);
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const row = await resourceService.updateResource(req.params.id, req.body, req);
    return res.status(200).json(row);
  } catch (error) {
    if (error.message === 'Resource not found.') return res.status(404).json({ message: error.message });
    return res.status(400).json({ message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const result = await resourceService.deleteResource(req.params.id, req);
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Resource not found.') return res.status(404).json({ message: error.message });
    return res.status(400).json({ message: error.message });
  }
};

const restock = async (req, res) => {
  try {
    const row = await resourceService.restockResource(req.params.id, req.body.quantity, req);
    return res.status(200).json(row);
  } catch (error) {
    if (error.message === 'Resource not found.') return res.status(404).json({ message: error.message });
    return res.status(400).json({ message: error.message });
  }
};

const programResources = async (req, res) => {
  try {
    const items = await resourceService.listProgramResources(req.params.programId);
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const recordUsage = async (req, res) => {
  try {
    const { resourceId, quantityUsed } = req.body;
    const row = await resourceService.recordUsage(req.params.programId, resourceId, quantityUsed, req);
    return res.status(200).json(row);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const fieldManagerInventory = async (req, res) => {
  try {
    const items = await resourceService.listForFieldManager(req.user.userId);
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { list, create, update, remove, restock, programResources, recordUsage, fieldManagerInventory };
