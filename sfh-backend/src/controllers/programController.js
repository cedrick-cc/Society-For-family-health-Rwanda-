const { PrismaClient } = require('@prisma/client');
const programService = require('../services/programService');
const programVolunteerService = require('../services/programVolunteerService');

const prisma = new PrismaClient();

const create = async (req, res) => {
  try {
    const program = await programService.createProgram(req.body, req.user.userId, req);
    return res.status(201).json(program);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const list = async (req, res) => {
  try {
    const programs = await programService.listPrograms();
    return res.status(200).json(programs);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load programs.' });
  }
};

const listFieldManagers = async (req, res) => {
  try {
    const availableOnly = req.query.availableOnly === 'true' || req.query.availableOnly === '1';
    const users = await programService.listFieldManagers({ availableOnly });
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load field managers.' });
  }
};

const listAsFieldManager = async (req, res) => {
  try {
    if (req.user.role !== 'FIELD_MANAGER') {
      return res.status(403).json({ message: 'Field managers only.' });
    }
    const programs = await programService.listProgramsForFieldManager(req.user.userId);
    return res.status(200).json(programs);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load programs.' });
  }
};

const listAsVolunteer = async (req, res) => {
  try {
    if (req.user.role !== 'VOLUNTEER') {
      return res.status(403).json({ message: 'Volunteers only.' });
    }
    const programs = await programService.listProgramsForVolunteer(req.user.userId);
    return res.status(200).json(programs);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load programs.' });
  }
};

const getOne = async (req, res) => {
  try {
    const program = await programService.getProgramById(req.params.id);
    if (!program) return res.status(404).json({ message: 'Program not found.' });
    return res.status(200).json(program);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load program.' });
  }
};

const update = async (req, res) => {
  try {
    const program = await programService.updateProgram(req.params.id, req.body, req);
    return res.status(200).json(program);
  } catch (error) {
    if (error.message === 'Program not found.') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(400).json({ message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const result = await programService.deleteProgram(req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Program not found.') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(400).json({ message: error.message });
  }
};

const assertCanManageVolunteers = async (req, programId) => {
  if (req.user.role === 'ADMIN') return;
  if (req.user.role !== 'FIELD_MANAGER') {
    const err = new Error('Only administrators and the assigned field manager can manage volunteer deployment.');
    err.statusCode = 403;
    throw err;
  }
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { fieldManagerId: true },
  });
  if (!program) {
    const err = new Error('Program not found.');
    err.statusCode = 404;
    throw err;
  }
  if (program.fieldManagerId !== req.user.userId) {
    const err = new Error('Only the assigned field manager can manage volunteer deployment.');
    err.statusCode = 403;
    throw err;
  }
};

const listAvailableVolunteers = async (req, res) => {
  try {
    await assertCanManageVolunteers(req, req.params.id);
    const list = await programVolunteerService.listAvailableVolunteers(req.params.id);
    return res.status(200).json(list);
  } catch (error) {
    const code = error.statusCode || 500;
    return res.status(code).json({ message: error.message });
  }
};

const assignVolunteersToProgram = async (req, res) => {
  try {
    await assertCanManageVolunteers(req, req.params.id);
    const program = await programVolunteerService.assignVolunteers(
      req.params.id,
      req.body.volunteerIds,
      req.user.userId
    );
    return res.status(200).json(program);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const removeVolunteerFromProgram = async (req, res) => {
  try {
    await assertCanManageVolunteers(req, req.params.id);
    const result = await programVolunteerService.unassignVolunteer(req.params.id, req.params.volunteerId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = {
  create,
  list,
  listFieldManagers,
  listAsFieldManager,
  listAsVolunteer,
  getOne,
  update,
  remove,
  listAvailableVolunteers,
  assignVolunteersToProgram,
  removeVolunteerFromProgram,
};
